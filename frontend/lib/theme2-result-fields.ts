import {
  CompetitionOutput,
  formatFaultTypeV2,
  formatInputComponent,
  formatObservationResult,
  formatRecipientType,
  Theme2VisualExtraction,
} from "./api";

export type OrganizerOutputField = {
  label: string;
  value: string;
};

function readable(value: string | null | undefined, fallback = "Not readable") {
  const text = value?.trim();
  return text ? text : fallback;
}

function formatAmp(value: number | null | undefined) {
  return typeof value === "number" ? `${value}A` : "";
}

function formatPoles(value: string | null | undefined) {
  if (!value || value === "unknown") return "";
  return value.toUpperCase();
}

function formatRccbType(value: string | null | undefined) {
  if (value === "type_a") return "Type A";
  if (value === "type_ac") return "Type AC";
  return "Type unknown";
}

function formatSpecStatus(value: string | null | undefined) {
  switch (value) {
    case "correct":
      return "Correct specs readable";
    case "wrong":
      return "Wrong specs detected";
    case "missing":
      return "Missing MCB/RCCB detected";
    case "incomplete":
      return "Spec labels incomplete";
    default:
      return "Spec status unknown";
  }
}

function formatSwitchState(value: string | null | undefined) {
  if (value === "on") return "ON";
  if (value === "off") return "OFF / open circuit";
  return "Not confirmed";
}

function compactParts(parts: Array<string | null | undefined>, fallback: string) {
  const text = parts.filter(Boolean).join(" / ");
  return text || fallback;
}

function mcbEvidence(extraction: Theme2VisualExtraction) {
  return compactParts(
    [
      extraction.mcb_visible === false ? "Not visible" : undefined,
      formatAmp(extraction.mcb_current_amp),
      formatPoles(extraction.mcb_poles),
      extraction.mcb_rating,
      extraction.mcb_brand_model,
    ],
    "MCB label not readable"
  );
}

function rccbEvidence(extraction: Theme2VisualExtraction) {
  return compactParts(
    [
      extraction.rccb_visible === false ? "Not visible" : undefined,
      formatAmp(extraction.rccb_current_amp),
      formatPoles(extraction.rccb_poles),
      formatRccbType(extraction.rccb_type),
      extraction.rccb_rating,
      extraction.rccb_brand_model,
    ],
    "RCCB label not readable"
  );
}

function componentEvidenceFields(output: CompetitionOutput, extraction: Theme2VisualExtraction): OrganizerOutputField[] {
  if (output.input_component === "charger") {
    return [
      ["Charger Serial Number", readable(output.charger_serial_number || extraction.charger_serial_number)],
      ["Brand / Model", readable(output.charger_brand_model || extraction.charger_brand_model)],
    ].map(([label, value]) => ({ label, value }));
  }

  if (output.input_component === "evdb") {
    return [
      { label: "MCB Evidence", value: mcbEvidence(extraction) },
      { label: "RCCB Evidence", value: rccbEvidence(extraction) },
      { label: "EVDB Spec Status", value: formatSpecStatus(extraction.evdb_spec_status) },
    ];
  }

  if (output.input_component === "isolator") {
    return [
      { label: "Switch State", value: formatSwitchState(extraction.isolator_state) },
      {
        label: "Circuit Evidence",
        value:
          output.observation_result === "isolator_off_open_circuit"
            ? "Open circuit / power cut"
            : "Switch state proof required if unclear",
      },
    ];
  }

  return [
    { label: "Evidence Component", value: "Not confirmed" },
    { label: "Proof Status", value: "Clearer Theme 2 evidence required" },
  ];
}

export function buildOrganizerOutputFields(
  output: CompetitionOutput,
  extraction: Theme2VisualExtraction
): OrganizerOutputField[] {
  const recipient =
    output.recipient_type === "after_sales_team" && output.assigned_team_id
      ? `${formatRecipientType(output.recipient_type)}: ${output.assigned_team_id}`
      : formatRecipientType(output.recipient_type);

  return [
    { label: "Input Component", value: formatInputComponent(output.input_component) },
    { label: "Observation Result", value: formatObservationResult(output.observation_result) },
    ...componentEvidenceFields(output, extraction),
    { label: "Fault Type", value: formatFaultTypeV2(output.fault_type_v2) },
    { label: "Recipient", value: recipient },
    { label: "Action Message", value: output.action_message },
  ];
}
