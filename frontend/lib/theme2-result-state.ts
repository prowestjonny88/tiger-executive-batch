import {
  formatRecipientType,
  type ApiTriageResponse,
} from "./api";
import { isEvdbSpecCompleteAndCorrect } from "./theme2-result-fields";

export type ResultProofState =
  | "verified"
  | "verification_required"
  | "wrong_or_missing"
  | "after_sales"
  | "safety_review"
  | "unknown";

export type ResultTone = "green" | "blue" | "amber" | "red" | "slate";

export type DerivedResultState = {
  proofState: ResultProofState;
  tone: ResultTone;
  title: string;
  status: string;
  nextStep: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  recipientHelper: string;
};

function hasSafetySignal(triage: ApiTriageResponse) {
  const output = triage.competition_output;
  const overrideKey = typeof triage.debug.extra?.override_key === "string" ? triage.debug.extra.override_key : "";
  if (/safety/i.test(overrideKey)) return true;

  const text = [
    output.action_message,
    output.required_proof_next,
    ...output.evidence_notes,
  ]
    .filter(Boolean)
    .join(" ");

  return /stop[- ]use|stop using|burnt|burning smell|smoke|sparking|melted|hot to touch|water ingress|exposed conductor/i.test(text);
}

function afterSalesTeam(triage: ApiTriageResponse) {
  return triage.competition_output.assigned_team_id || "AS_TEAM_01";
}

function afterSalesState(triage: ApiTriageResponse, title = "After-sales Routing Ready"): DerivedResultState {
  const teamId = afterSalesTeam(triage);
  return {
    proofState: "after_sales",
    tone: "blue",
    title,
    status: `Message routed to After-sales Team: ${teamId}`,
    nextStep: `Route this case to After-sales Team ${teamId} for technical review.`,
    primaryCtaLabel: "View After-sales Routing",
    primaryCtaHref: "/escalation",
    recipientHelper: "Technical review is required before customer action.",
  };
}

export function deriveResultState(triage: ApiTriageResponse): DerivedResultState {
  const output = triage.competition_output;
  const extraction = triage.perception.extraction;

  if (hasSafetySignal(triage)) {
    return {
      proofState: "safety_review",
      tone: "red",
      title: "Safety Review Required",
      status: "Stop-use or hazard evidence detected",
      nextStep: "Do not continue use until the case is reviewed by qualified personnel.",
      primaryCtaLabel: output.recipient_type === "after_sales_team" ? "View After-sales Routing" : "View Safety Instructions",
      primaryCtaHref: output.recipient_type === "after_sales_team" ? "/escalation" : "/safety",
      recipientHelper: "Do not continue use until reviewed by qualified personnel.",
    };
  }

  if (output.input_component === "evdb") {
    const isWrongOrMissing =
      extraction.evdb_spec_status === "wrong" ||
      extraction.evdb_spec_status === "missing" ||
      output.observation_result === "wrong_component_specs" ||
      output.observation_result === "missing_mcb_rccb";

    if (isWrongOrMissing) {
      return {
        ...afterSalesState(triage, "Protection Issue Detected"),
        proofState: "wrong_or_missing",
        status: `Message routed to After-sales Team: ${afterSalesTeam(triage)}`,
      };
    }

    if (isEvdbSpecCompleteAndCorrect(extraction)) {
      return {
        proofState: "verified",
        tone: "green",
        title: "EVDB Specs Verified",
        status: "No protection issue detected from visible EVDB evidence",
        nextStep: "Proceed to customer guidance. No protection issue is detected from the visible EVDB evidence.",
        primaryCtaLabel: "View Customer Guidance",
        primaryCtaHref: "/guidance",
        recipientHelper: "Customer can continue with the recommended guidance based on verified visible evidence.",
      };
    }

    if (output.observation_result === "evdb_single_phase" || output.observation_result === "evdb_three_phase") {
      return {
        proofState: "verification_required",
        tone: "amber",
        title: "Verification Required",
        status: "EVDB phase is detected, but breaker specs still need clearer proof",
        nextStep: "Take or upload a clearer close-up photo of the MCB/RCCB labels before closing this case.",
        primaryCtaLabel: "View Verification Guidance",
        primaryCtaHref: "/guidance",
        recipientHelper: "Customer can provide safer visual proof before after-sales escalation is needed.",
      };
    }
  }

  if (output.recipient_type === "after_sales_team") {
    return afterSalesState(triage);
  }

  if (output.required_proof_next || triage.follow_up_prompts.length > 0 || output.recipient_type === "unknown" || output.fault_type_v2 === "unknown") {
    return {
      proofState: "verification_required",
      tone: "amber",
      title: "Verification Required",
      status: "More proof is needed before the result is final",
      nextStep: output.required_proof_next || "Add clearer Theme 2 evidence before closing this case.",
      primaryCtaLabel: "View Verification Guidance",
      primaryCtaHref: "/guidance",
      recipientHelper:
        output.recipient_type === "customer"
          ? "Customer can provide safer visual proof before after-sales escalation is needed."
          : "Routing will stay conservative until clearer evidence is available.",
    };
  }

  if (output.recipient_type === "customer") {
    return {
      proofState: "verified",
      tone: "green",
      title: "Customer Action Ready",
      status: "Result displayed to customer",
      nextStep: "Proceed to customer guidance and follow the recommended action.",
      primaryCtaLabel: "View Customer Guidance",
      primaryCtaHref: "/guidance",
      recipientHelper: "Customer can continue with the recommended guidance.",
    };
  }

  if (output.recipient_type === "none") {
    return {
      proofState: "verified",
      tone: "slate",
      title: "Theme 2 Result Captured",
      status: "No routing required",
      nextStep: "Review the captured Theme 2 output and add fault evidence if troubleshooting is needed.",
      primaryCtaLabel: "Run Triage Again",
      primaryCtaHref: "/upload",
      recipientHelper: formatRecipientType(output.recipient_type),
    };
  }

  return {
    proofState: "unknown",
    tone: "slate",
    title: "Theme 2 Result Needs Review",
    status: "The system could not determine a confident routing result",
    nextStep: "Add more Theme 2 evidence before closing this case.",
    primaryCtaLabel: "Add More Evidence",
    primaryCtaHref: "/upload",
    recipientHelper: "Routing is unknown until clearer evidence is available.",
  };
}
