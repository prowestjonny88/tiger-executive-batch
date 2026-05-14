export type UploadedPhotoEvidence = {
  filename: string;
  media_type: string;
  storage_path: string;
  byte_size: number;
};

export type EvidenceType = "hardware_photo" | "screenshot" | "symptom_report" | "symptom_heavy_photo" | "mixed_photo" | "unknown";
export type InputComponent = "charger" | "evdb" | "isolator" | "unknown";
export type ObservationResultV2 =
  | "charger_red_light"
  | "charger_blinking_red_light"
  | "charger_no_light"
  | "charger_serial_brand_visible"
  | "evdb_single_phase"
  | "evdb_three_phase"
  | "mcb_tripped"
  | "missing_mcb_rccb"
  | "wrong_component_specs"
  | "isolator_on"
  | "isolator_off_open_circuit"
  | "unknown";
export type FaultTypeV2 =
  | "protection_issue"
  | "charger_issue"
  | "supply_issue"
  | "installation_issue"
  | "manual_error"
  | "power_cut"
  | "identification_only"
  | "unknown";
export type RecipientType = "customer" | "after_sales_team" | "none" | "unknown";

export type Theme2VisualExtraction = {
  input_component: InputComponent;
  observation_result: ObservationResultV2;
  charger_serial_number?: string | null;
  charger_brand_model?: string | null;
  indicator_status: "red_light" | "blinking_red_light" | "no_light" | "unknown";
  evdb_phase_type: "single_phase" | "three_phase" | "unknown";
  mcb_visible?: boolean | null;
  rccb_visible?: boolean | null;
  mcb_rating?: string | null;
  rccb_rating?: string | null;
  rccb_type: "type_a" | "type_ac" | "unknown";
  isolator_state: "on" | "off" | "unknown";
  raw_visible_text: string[];
  confidence_score: number;
  uncertainty_notes: string[];
};

export type CompetitionOutput = {
  input_component: InputComponent;
  observation_result: ObservationResultV2;
  charger_serial_number?: string | null;
  charger_brand_model?: string | null;
  fault_type_v2: FaultTypeV2;
  recipient_type: RecipientType;
  assigned_team_id?: string | null;
  action_message: string;
  required_proof_next?: string | null;
  confidence_score: number;
  evidence_notes: string[];
  source: "theme2_rule_mapper" | "fallback";
};

export type Theme2FollowUpPrompt = {
  question_id: string;
  prompt: string;
  reason?: string | null;
};

export type ApiTriageResponse = {
  incident_id: number;
  incident: {
    incident_id?: number;
    site_id: string;
    charger_id?: string;
    photo_evidence?: UploadedPhotoEvidence;
    photo_hint?: string;
    symptom_text?: string;
    error_code?: string;
    follow_up_answers?: Record<string, string>;
    demo_scenario_id?: string;
  };
  perception: {
    mode: "vlm" | "heuristic" | "text_only";
    evidence_type: EvidenceType;
    scene_summary: string;
    components_visible: string[];
    visible_abnormalities: string[];
    ocr_findings: string[];
    hazard_signals: string[];
    uncertainty_notes: string[];
    confidence_score: number;
    requires_follow_up: boolean;
    provider_attempted: boolean;
    fallback_used: boolean;
    error_type?: string | null;
    error_message?: string | null;
    raw_provider_output?: string | null;
    extraction: Theme2VisualExtraction;
  };
  competition_output: CompetitionOutput;
  follow_up_prompts: Theme2FollowUpPrompt[];
  debug: {
    perception_mode: string;
    provider_attempted: boolean;
    fallback_used: boolean;
    raw_provider_output?: string | null;
    rule_version?: string | null;
    rule_key?: string | null;
    error_log_key?: string | null;
    folder_weak_label?: string | null;
    extra?: Record<string, unknown>;
  };
};

export type PreviewResponse = {
  incident_id: number;
  quality: {
    filename?: string;
    media_type?: string;
    storage_path?: string;
    byte_size?: number;
    quality_status: "usable" | "weak" | "retake_required";
    notes: string[];
  };
  follow_up_questions: Theme2FollowUpPrompt[];
};

export type SiteOption = {
  site_id: string;
  site_name: string;
  charger_id: string;
  charger_label: string;
  has_local_resolver: boolean;
  has_remote_ops: boolean;
  notes?: string;
};

export type ScenarioOption = {
  scenario_id: string;
  name: string;
  site_id: string;
  headline: string;
  photo_hint: string;
  symptom_text: string;
  error_code: string;
  follow_up_answers: Record<string, string>;
  expected_input_component: InputComponent;
  expected_observation_result: ObservationResultV2;
  expected_fault_type_v2: FaultTypeV2;
  expected_recipient_type: RecipientType;
};

export type IncidentHistoryItem = {
  id: number;
  site_id: string;
  charger_id?: string;
  photo_evidence?: UploadedPhotoEvidence | null;
  photo_hint?: string;
  symptom_text?: string;
  error_code?: string;
  demo_scenario_id?: string;
  created_at: string;
  latest_stage?: string | null;
  latest_stage_at?: string | null;
  latest_input_component?: InputComponent | null;
  latest_observation_result?: ObservationResultV2 | null;
  latest_fault_type_v2?: FaultTypeV2 | null;
  latest_recipient_type?: RecipientType | null;
  latest_assigned_team_id?: string | null;
  latest_confidence_score?: number | null;
  latest_action_message?: string | null;
  latest_rule_key?: string | null;
};

export type IncidentHistoryDetailItem = IncidentHistoryItem & {
  follow_up_answers?: Record<string, string>;
  triage_payload?: ApiTriageResponse;
};

const backendAssetBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "";

export function resolveEvidenceUrl(storagePath?: string | null) {
  if (!storagePath) return "";
  const normalizedPath = storagePath.startsWith("/") ? storagePath : `/${storagePath}`;
  if (!backendAssetBase) return normalizedPath;
  return `${backendAssetBase.replace(/\/$/, "")}${normalizedPath}`;
}

async function postJson<T>(url: string, payload: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as T;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as T;
}

export async function fetchSites() {
  return getJson<SiteOption[]>("/api/sites");
}

export async function fetchScenarios() {
  return getJson<ScenarioOption[]>("/api/demo/scenarios");
}

export async function fetchIncidents() {
  return getJson<IncidentHistoryItem[]>("/api/incidents");
}

export async function fetchIncidentById(id: number) {
  return getJson<IncidentHistoryDetailItem>(`/api/incidents/${id}`);
}

export async function fetchPreview(payload: {
  incident_id?: number;
  site_id: string;
  charger_id?: string;
  photo_evidence?: UploadedPhotoEvidence;
  photo_hint: string;
  symptom_text: string;
  error_code: string;
  follow_up_answers?: Record<string, string>;
  demo_scenario_id?: string;
}) {
  return postJson<PreviewResponse>("/api/intake/preview", payload);
}

export async function fetchTriage(payload: {
  incident_id?: number;
  site_id: string;
  charger_id?: string;
  photo_evidence?: UploadedPhotoEvidence;
  photo_hint: string;
  symptom_text: string;
  error_code: string;
  follow_up_answers?: Record<string, string>;
  demo_scenario_id?: string;
}) {
  return postJson<ApiTriageResponse>("/api/triage", payload);
}

export async function uploadIncidentPhoto(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return postJson<UploadedPhotoEvidence>("/api/uploads", {
    filename: file.name,
    media_type: file.type,
    content_base64: btoa(binary),
  });
}

function titleize(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatInputComponent(value?: string | null) {
  if (!value || value === "unknown") return "Unknown";
  if (value === "evdb") return "EVDB";
  return titleize(value);
}

export function formatObservationResult(value?: string | null) {
  switch (value) {
    case "charger_red_light":
      return "Charger Red Light";
    case "charger_blinking_red_light":
      return "Charger Blinking Red Light";
    case "charger_no_light":
      return "Charger No Light";
    case "charger_serial_brand_visible":
      return "Charger Serial / Brand Visible";
    case "evdb_single_phase":
      return "EVDB Single Phase";
    case "evdb_three_phase":
      return "EVDB Three Phase";
    case "mcb_tripped":
      return "MCB Tripped";
    case "missing_mcb_rccb":
      return "Missing MCB / RCCB";
    case "wrong_component_specs":
      return "Wrong Component / Specs";
    case "isolator_on":
      return "Isolator ON";
    case "isolator_off_open_circuit":
      return "Isolator OFF / Open Circuit";
    default:
      return "Unknown";
  }
}

export function formatFaultTypeV2(value?: string | null) {
  switch (value) {
    case "protection_issue":
      return "Protection Issue";
    case "charger_issue":
      return "Charger Issue";
    case "supply_issue":
      return "Supply Issue";
    case "installation_issue":
      return "Installation Issue";
    case "manual_error":
      return "Manual Error";
    case "power_cut":
      return "Power Cut";
    case "identification_only":
      return "Identification Only";
    default:
      return "Unknown";
  }
}

export function formatRecipientType(value?: string | null) {
  switch (value) {
    case "customer":
      return "Customer";
    case "after_sales_team":
      return "After-sales Team";
    case "none":
      return "No Routing Required";
    default:
      return "Unknown";
  }
}
