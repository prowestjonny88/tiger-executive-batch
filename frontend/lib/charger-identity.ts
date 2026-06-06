import type { ApiTriageResponse } from "./api";

export type ChargerIdentitySuggestion = {
  brand_model?: string;
  serial_number?: string;
  confidence: "high" | "medium" | "low" | "unknown";
  source: "triage_output" | "perception" | "incident" | "none";
  needs_closeup: boolean;
  note: string;
};

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function extractChargerIdentitySuggestion(triage: ApiTriageResponse): ChargerIdentitySuggestion {
  const output = triage.competition_output;
  const extraction = triage.perception?.extraction;
  const incident = triage.incident;

  const outputSerial = clean(output?.charger_serial_number);
  const outputBrand = clean(output?.charger_brand_model);
  const extractionSerial = clean(extraction?.charger_serial_number);
  const extractionBrand = clean(extraction?.charger_brand_model);
  const incidentSerial = clean(incident?.charger_id);

  const serialNumber = outputSerial || extractionSerial || incidentSerial;
  const brandModel = outputBrand || extractionBrand;
  const source: ChargerIdentitySuggestion["source"] =
    outputSerial || outputBrand ? "triage_output" : extractionSerial || extractionBrand ? "perception" : incidentSerial ? "incident" : "none";
  const hasAnyIdentity = Boolean(serialNumber || brandModel);

  return {
    serial_number: serialNumber || undefined,
    brand_model: brandModel || undefined,
    confidence: hasAnyIdentity ? "medium" : "unknown",
    source,
    needs_closeup: !hasAnyIdentity,
    note: hasAnyIdentity
      ? "Possible charger identity found from the uploaded photo. Please confirm or edit before creating the ticket."
      : "The charger label was not readable. You can continue without it, enter it manually, or upload a close-up label later.",
  };
}

export function formatIdentityConfidence(value?: ChargerIdentitySuggestion["confidence"]) {
  switch (value) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "Unknown";
  }
}
