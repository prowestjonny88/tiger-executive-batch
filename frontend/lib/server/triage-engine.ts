import { scenarios, sites, type IssueType } from "../demo-data";

export type IntakePayload = {
  incident_id?: number;
  site_id: string;
  charger_id?: string;
  photo_evidence?: {
    filename: string;
    media_type: string;
    storage_path: string;
    byte_size: number;
  };
  photo_hint?: string;
  symptom_text?: string;
  error_code?: string;
  follow_up_answers?: Record<string, string>;
  demo_scenario_id?: string;
};

type BasicCheckStatus = "ok" | "problem" | "unknown";
type WorkflowOutcome = "resolved" | "escalate";

function buildText(input: IntakePayload) {
  return `${input.photo_hint ?? ""} ${input.symptom_text ?? ""} ${input.error_code ?? ""} ${Object.entries(
    input.follow_up_answers ?? {},
  )
    .map(([key, value]) => `${key}:${value}`)
    .join(" ")}`.toLowerCase();
}

function inferBasicConditions(input: IntakePayload) {
  const text = buildText(input);

  const mainPowerSupply: BasicCheckStatus =
    /(power available|display on|screen on|screen dim|incoming voltage ok|main_power_supply:.*available|main_power_supply:.*ok)/.test(text)
      ? "ok"
      : /(no power|lights off|display off|incoming voltage low|incoming voltage missing|main_power_supply:.*missing|main_power_supply:.*no)/.test(text)
        ? "problem"
        : "unknown";

  const negativeCableSignal =
    /(no damage|no visible damage|cable and connector are normal|cable_condition:.*good|cable_condition:.*normal)/.test(text);
  const cableCondition: BasicCheckStatus =
    /(burn|exposed|scorch|water|frayed|melt|overheat|loose cable|connector feels hot|cable_condition:.*loose|cable_condition:.*damage|cable_condition:.*overheat)/.test(
      text,
    ) || (/\bdamage\b/.test(text) && !negativeCableSignal)
      ? "problem"
      : negativeCableSignal
        ? "ok"
        : "unknown";

  const indicatorOrErrorCode: BasicCheckStatus =
    input.error_code || /(indicator|led|blink|display|screen|indicator_or_error_code:)/.test(text)
      ? "ok"
      : /(blank screen|no indicator|screen dead|display dead)/.test(text)
        ? "problem"
        : "unknown";

  return {
    main_power_supply: mainPowerSupply,
    cable_condition: cableCondition,
    indicator_or_error_code: indicatorOrErrorCode,
    indicator_detail: input.error_code ?? "",
  };
}

function inferIssueType(input: IntakePayload, basicConditions: ReturnType<typeof inferBasicConditions>): IssueType {
  const text = buildText(input);
  if (/(tripping|breaker|mcb|rccb|rcd|trip-)/.test(text)) return "tripping_mcb_rccb";
  if (/(slow|reduced output|low current|voltage drop|vehicle limitation|slow-)/.test(text)) return "charging_slow";
  if (/(not responding|unresponsive|frozen|buttons do nothing|blank screen|ui-)/.test(text)) return "not_responding";
  if (/(no power|lights off|display off|dead charger|incoming voltage)/.test(text)) return "no_power";
  if (basicConditions.main_power_supply === "problem") return "no_power";
  if (basicConditions.cable_condition === "problem") return "tripping_mcb_rccb";
  return "not_responding";
}

function likelyFault(issueType: IssueType, basicConditions: ReturnType<typeof inferBasicConditions>) {
  switch (issueType) {
    case "no_power":
      return basicConditions.main_power_supply === "problem"
        ? "Main supply or breaker issue"
        : "Power supply not reaching charger";
    case "tripping_mcb_rccb":
      return basicConditions.cable_condition === "problem"
        ? "Loose or overheated cable connection"
        : "Breaker protection is tripping";
    case "charging_slow":
      return "Output setting or vehicle limitation";
    case "not_responding":
      return basicConditions.indicator_or_error_code === "problem"
        ? "Control board or display not responding"
        : "System needs a controlled reset";
  }
}

const branchActions: Record<IssueType, string[]> = {
  no_power: [
    "Check DB / MCB state.",
    "Check incoming voltage.",
    "Resolve the supply issue if found, otherwise escalate.",
  ],
  tripping_mcb_rccb: [
    "Check MCB or RCCB rating.",
    "Inspect for overheating or loose cable connections.",
    "Reduce current setting or replace the protective device if required.",
  ],
  charging_slow: [
    "Check current output setting.",
    "Check for vehicle-side charging limitations.",
    "Check voltage drop and advise the customer accordingly.",
  ],
  not_responding: [
    "Perform a controlled power cycle.",
    "Inspect the PCB and display/control path.",
    "Reset the system or escalate if the unit remains unresponsive.",
  ],
};

function workflowFor(input: IntakePayload, issueType: IssueType, basicConditions: ReturnType<typeof inferBasicConditions>) {
  const text = buildText(input);
  const hazardFlags = /(burn|exposed|scorch|water|melt)/.test(text) ? ["visible_hazard"] : [];
  const unknownChecks = Object.values(basicConditions).slice(0, 3).includes("unknown");

  let outcome: WorkflowOutcome = "resolved";
  let rationale = "Organizer decision tree supports branch-level troubleshooting and case closure after reporting.";
  let nextAction = "Follow the branch SOP in order and close the case if the issue is corrected.";
  let fallbackAction = "Escalate if the issue remains unresolved after the SOP.";

  if (hazardFlags.length > 0 || unknownChecks) {
    outcome = "escalate";
    rationale =
      hazardFlags.length > 0
        ? "Hazard evidence overrides branch closure and forces escalation."
        : "Organizer basic checks remain uncertain, so the case cannot be closed safely.";
    nextAction = hazardFlags.length > 0
      ? "Escalate the case and isolate the charger."
      : "Escalate for supervised follow-up and confirm the missing organizer checks.";
    fallbackAction = "Rerun triage after new evidence is collected.";
  } else if (issueType === "tripping_mcb_rccb" && basicConditions.cable_condition === "problem") {
    outcome = "escalate";
    rationale = "Tripping plus cable-condition problems suggests an unsafe branch failure and should be escalated.";
    nextAction = "Escalate after documenting overheating or loose-cable findings.";
    fallbackAction = "Keep the charger isolated until inspected.";
  } else if (issueType === "not_responding" && basicConditions.main_power_supply === "problem") {
    outcome = "escalate";
    rationale = "A non-responding charger without stable power cannot be safely closed through reset steps alone.";
    nextAction = "Escalate and confirm supply integrity before further reset attempts.";
    fallbackAction = "Re-run the branch once stable power is restored.";
  }

  return {
    issue_type: issueType,
    branch_actions: branchActions[issueType],
    outcome,
    rationale,
    next_action: nextAction,
    fallback_action: fallbackAction,
    hazard_flags: hazardFlags,
  };
}

export function buildFallbackTriage(input: IntakePayload) {
  const site = sites.find((entry) => entry.site_id === input.site_id) ?? sites[0];
  const basicConditions = inferBasicConditions(input);
  const issueType = inferIssueType(input, basicConditions);
  const workflow = workflowFor(input, issueType, basicConditions);
  const confidenceBand: "high" | "medium" | "low" =
    workflow.outcome === "escalate"
      ? Object.values(basicConditions).slice(0, 3).includes("unknown")
        ? "medium"
        : "high"
      : issueType === "charging_slow" || issueType === "no_power"
        ? "high"
        : "medium";
  const confidenceScore = confidenceBand === "high" ? 0.88 : confidenceBand === "medium" ? 0.72 : 0.52;
  const likely_fault = likelyFault(issueType, basicConditions);

  return {
    incident_id: input.incident_id ?? 0,
    incident: {
      ...input,
      charger_id: input.charger_id ?? site.charger_id,
    },
    diagnosis: {
      raw_provider_output: "Organizer fallback demo provider",
      issue_type: issueType,
      likely_fault,
      evidence_summary: input.symptom_text || input.photo_hint || "Limited evidence provided.",
      basic_conditions: basicConditions,
      raw_ocr_text: input.error_code ?? "",
      confidence_score: confidenceScore,
      confidence_band: confidenceBand,
      unknown_flag: Object.values(basicConditions).slice(0, 3).includes("unknown"),
      severity: workflow.hazard_flags.length > 0 ? "critical" : workflow.outcome === "escalate" ? "high" : "moderate",
      hazard_flags: workflow.hazard_flags,
    },
    confidence: {
      score: confidenceScore,
      band: confidenceBand,
      requires_confirmation: confidenceBand === "medium",
      safety_override: workflow.hazard_flags.length > 0,
      rationale:
        workflow.hazard_flags.length > 0
          ? "Hazard evidence forces escalation."
          : Object.values(basicConditions).slice(0, 3).includes("unknown")
            ? "Organizer basic checks remain incomplete and need confirmation."
            : "Confidence is sufficient to apply the organizer branch directly.",
    },
    workflow: {
      issue_type: workflow.issue_type,
      branch_actions: workflow.branch_actions,
      outcome: workflow.outcome,
      rationale: workflow.rationale,
      next_action: workflow.next_action,
      fallback_action: workflow.fallback_action,
    },
    artifact: {
      issue_type: issueType,
      title:
        issueType === "no_power"
          ? "No Power SOP"
          : issueType === "tripping_mcb_rccb"
            ? "Tripping MCB/RCCB SOP"
            : issueType === "charging_slow"
              ? "Charging Slow SOP"
              : "Not Responding SOP",
      summary: likely_fault,
      steps: branchActions[issueType],
      safety_note:
        workflow.outcome === "escalate"
          ? "Keep the charger isolated and escalate if any step reveals hazard or abnormal heating."
          : "Stop the SOP immediately and escalate if the charger condition becomes unsafe.",
      evidence_focus: [
        input.symptom_text || input.photo_hint || "Limited evidence provided.",
        `Main power supply: ${basicConditions.main_power_supply}`,
        `Cable condition: ${basicConditions.cable_condition}`,
        `Indicator / error code: ${basicConditions.indicator_or_error_code}`,
        ...workflow.hazard_flags,
      ],
    },
  };
}

export function buildFallbackPreview(input: IntakePayload) {
  const text = (input.photo_hint ?? "").toLowerCase();
  const notes: string[] = [];
  let quality: "usable" | "weak" | "retake_required" = "usable";

  if (input.photo_evidence) {
    if (input.photo_evidence.byte_size < 15_000) {
      quality = "retake_required";
      notes.push("Uploaded image file is too small for reliable diagnosis.");
    } else if (input.photo_evidence.byte_size < 40_000) {
      quality = "weak";
      notes.push("Uploaded image is stored, but quality looks weak from file size.");
    } else {
      notes.push("Uploaded image captured and stored for initial triage.");
    }
  }
  if (/(dark|blurry|cropped)/.test(text)) {
    quality = "retake_required";
    notes.push("Operator notes suggest the image is too weak for reliable diagnosis.");
  } else if (/(dim|partial|far|weak)/.test(text) && quality !== "retake_required") {
    quality = "weak";
    notes.push("Operator notes suggest the image is usable but weak.");
  }
  if (notes.length === 0) {
    notes.push("Image is sufficient for initial triage.");
  }

  const followUpQuestions = [];
  if (quality !== "usable" || !input.error_code) {
    followUpQuestions.push(
      { question_id: "main_power_supply", prompt: "Is the main power supply available at the charger right now?" },
      { question_id: "cable_condition", prompt: "Does the cable and connector look good, or is there looseness, overheating, or visible damage?" },
      { question_id: "indicator_or_error_code", prompt: "What indicator state or error code do you see on the charger?" },
    );
  }

  return {
    incident_id: input.incident_id ?? 0,
    quality: {
      filename: input.photo_evidence?.filename ?? "placeholder.jpg",
      media_type: input.photo_evidence?.media_type ?? "image/jpeg",
      storage_path: input.photo_evidence?.storage_path ?? "uploads/placeholder.jpg",
      byte_size: input.photo_evidence?.byte_size ?? 0,
      quality_status: quality,
      notes,
    },
    follow_up_questions: followUpQuestions,
  };
}

export function getScenarioOptions() {
  return scenarios;
}
