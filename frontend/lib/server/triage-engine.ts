import { scenarios, sites, type ResolverTier } from "../demo-data";

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

export function buildFallbackTriage(input: IntakePayload) {
  const text = `${input.photo_hint ?? ""} ${input.symptom_text ?? ""} ${input.error_code ?? ""}`.toLowerCase();
  const site = sites.find((entry) => entry.site_id === input.site_id) ?? sites[0];

  let category = "unknown";
  let likelyFault = "Unconfirmed charger issue";
  let confidenceBand: "high" | "medium" | "low" = "low";
  let confidenceScore = 0.52;
  let hazardFlags: string[] = [];

  const hasNegativeDamageSignal =
    text.includes("no damage") ||
    text.includes("no visible damage") ||
    text.includes("without damage") ||
    text.includes("visible_damage:no") ||
    text.includes("visible_damage:none") ||
    text.includes("visible_damage:false");
  const hasVisibleDamage = /(burn|exposed|scorch|water)/.test(text) || (/\bdamage\b/.test(text) && !hasNegativeDamageSignal);

  if (hasVisibleDamage) {
    category = "hardware_risk";
    likelyFault = "Visible cable or connector damage";
    confidenceBand = "high";
    confidenceScore = 0.93;
    hazardFlags = ["visible_hazard"];
  } else if (/(offline|wifi|network|net-01|off-12|red)/.test(text)) {
    category = "connectivity";
    likelyFault = "Charger offline or network disconnect";
    confidenceBand = /off-12|dim/.test(text) ? "medium" : "high";
    confidenceScore = confidenceBand === "high" ? 0.88 : 0.74;
  }

  let resolverTier: ResolverTier = "remote_ops";
  let rationale = "Defaulting to supervised investigation.";
  let nextAction = "Review the case with remote support.";
  let fallbackAction = "Dispatch a technician if the issue persists.";
  const followUpAnswers = Object.fromEntries(
    Object.entries(input.follow_up_answers ?? {}).map(([key, value]) => [key, value.toLowerCase()]),
  );
  const supportsSafeLocalSop =
    site.has_local_resolver &&
    ["no", "none", "false"].includes(followUpAnswers.visible_damage ?? "") &&
    !["no", "off"].includes(followUpAnswers.screen_on ?? "");

  if (hazardFlags.length > 0) {
    resolverTier = "technician";
    rationale = "Visible hazard evidence forces technician escalation.";
    nextAction = "Isolate charger access and dispatch a technician.";
    fallbackAction = "Keep the charger unavailable until inspected.";
  } else if (category === "connectivity" && confidenceBand === "medium" && supportsSafeLocalSop) {
    resolverTier = "local_site_resolver";
    rationale = "Confirmation answers support a safe local SOP check by an authorized site responder.";
    nextAction = "Perform the approved local restart and isolation checklist once.";
    fallbackAction = "Escalate to remote ops if the charger does not recover safely.";
  } else if (category === "connectivity" && confidenceBand === "high" && site.has_local_resolver) {
    resolverTier = "driver";
    rationale = "High-confidence low-risk connectivity issue can begin with user guidance.";
    nextAction = "Retry the session once and confirm charger display status.";
    fallbackAction = "Escalate to remote ops if retry fails.";
  } else if (category === "connectivity") {
    resolverTier = "remote_ops";
    rationale = "Connectivity issue requires remote confirmation before lower-tier guidance.";
    nextAction = "Check remote heartbeat/status and confirm the charger is reachable.";
    fallbackAction = "Dispatch a technician if the charger remains offline.";
  }

  const titles: Record<ResolverTier, string> = {
    driver: "Driver Action Card",
    local_site_resolver: "Local Site SOP Card",
    remote_ops: "Remote Ops Action Pack",
    technician: "Technician Dispatch Packet",
  };

  const steps =
    resolverTier === "technician"
      ? [
          "Restrict access to the charger immediately.",
          "Inspect for visible cable, connector, or enclosure damage.",
          "Document hazard evidence before restart attempts.",
        ]
      : resolverTier === "remote_ops"
        ? [
            "Verify charger heartbeat or backend status.",
            "Confirm whether the charger recently lost connectivity.",
            "Escalate if the unit remains unreachable.",
          ]
        : resolverTier === "local_site_resolver"
          ? [
              "Confirm the charger is powered and no visible damage is present before touching site controls.",
              "Run the approved local restart or isolation SOP once.",
              "Escalate to remote ops if the charger still does not recover.",
            ]
        : [
            "Confirm the charger display is active.",
            "Stop and restart the session once.",
            "Escalate if charging still fails.",
          ];

  return {
    incident_id: input.incident_id ?? 0,
    incident: input,
    diagnosis: {
      raw_provider_output: "Fallback demo provider",
      internal_issue_category: category,
      likely_fault: likelyFault,
      evidence_summary: input.symptom_text || input.photo_hint || "Limited evidence provided.",
      raw_ocr_text: input.error_code ?? "",
      confidence_score: confidenceScore,
      confidence_band: confidenceBand,
      unknown_flag: category === "unknown",
      severity:
        resolverTier === "technician"
          ? "critical"
          : resolverTier === "driver"
            ? "low"
            : "moderate",
      hazard_flags: hazardFlags,
    },
    confidence: {
      score: confidenceScore,
      band: confidenceBand,
      requires_confirmation: confidenceBand === "medium",
      safety_override: hazardFlags.length > 0,
      rationale:
        confidenceBand === "medium" && hazardFlags.length === 0
          ? "Medium-confidence diagnosis needs confirmation before safe routing."
          : rationale,
    },
    routing: {
      resolver_tier: resolverTier,
      priority:
        resolverTier === "technician"
          ? "critical"
          : resolverTier === "driver"
            ? "low"
            : "moderate",
      rationale,
      next_action: nextAction,
      fallback_action: fallbackAction,
    },
    artifact: {
      resolver_tier: resolverTier,
      title: titles[resolverTier],
      summary: likelyFault,
      steps,
      safety_note: resolverTier === "technician" ? "Treat this unit as safety-sensitive until inspected." : "Do not attempt unsanctioned repair actions.",
      evidence_focus: [input.symptom_text || input.photo_hint || "Limited evidence provided.", ...hazardFlags],
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
  if (quality !== "usable") {
    followUpQuestions.push(
      { question_id: "screen_on", prompt: "Is the screen on?" },
      { question_id: "visible_damage", prompt: "Is there visible physical damage?" },
      { question_id: "charging_state", prompt: "Did charging stop suddenly or never start?" },
    );
  }
  if (!input.error_code) {
    followUpQuestions.push({ question_id: "led_behavior", prompt: "What is the LED color or blink behavior?" });
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
