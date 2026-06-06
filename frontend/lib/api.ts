import { compressImageForUpload } from "./image-compress";

export type UploadedPhotoEvidence = {
  kind?: string;
  filename: string;
  media_type: string;
  storage_path: string;
  byte_size: number;
  storage_provider?: "local" | "gcs";
  storage_key?: string | null;
  display_url?: string | null;
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

export type Theme2BoundingBox = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  source?: "vlm" | "heuristic";
};

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
  mcb_current_amp?: number | null;
  rccb_current_amp?: number | null;
  mcb_poles: "1p" | "2p" | "3p" | "4p" | "unknown";
  rccb_poles: "1p" | "2p" | "3p" | "4p" | "unknown";
  mcb_brand_model?: string | null;
  rccb_brand_model?: string | null;
  rccb_type: "type_a" | "type_ac" | "unknown";
  rccb_type_evidence: "text_label" | "symbol_only" | "mixed" | "unknown";
  rccb_symbol_description?: string | null;
  charger_brand_source: "text_label" | "logo_text" | "mixed" | "unknown";
  evdb_spec_status: "correct" | "wrong" | "missing" | "incomplete" | "unknown";
  isolator_state: "on" | "off" | "unknown";
  raw_visible_text: string[];
  bounding_boxes?: Theme2BoundingBox[];
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
    app_screenshot_evidence?: UploadedPhotoEvidence;
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
  app_screenshot_evidence?: UploadedPhotoEvidence | null;
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

export type CustomerProfile = {
  full_name: string;
  phone_number: string;
  whatsapp_number: string;
  email: string;
  preferred_contact_method: "whatsapp" | "phone" | "email";
};

export type ChargerContext = {
  installation_address: string;
  customer_type: "home" | "condo" | "commercial" | "public_site" | "unknown";
  installed_by: "rexharge" | "third_party" | "property_management" | "unknown";
  installer_name?: string | null;
  charger_serial_number?: string | null;
  charger_brand_model?: string | null;
  symptom_text?: string | null;
  error_code?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_accuracy_m?: number | null;
  location_source?: "manual" | "browser_geolocation" | "google_places" | "reverse_geocoded" | null;
  google_place_id?: string | null;
  formatted_address?: string | null;
  home_charger_location?: "car_porch" | "garage" | "outdoor_wall" | "indoor_wall" | "other" | "unknown" | null;
  charger_location_notes?: string | null;
};

export type TicketPriority = "Critical" | "High" | "Medium" | "Low";
export type TicketStatus =
  | "submitted"
  | "triaged"
  | "waiting_customer"
  | "assigned"
  | "scheduled"
  | "reschedule_requested"
  | "in_progress"
  | "resolved"
  | "closed"
  | "cancelled"
  | "reopened";

export type TicketEvent = {
  id: number;
  ticket_id: string;
  event_type: string;
  actor_role: "customer" | "staff" | "system";
  actor_name?: string | null;
  message: string;
  payload_json?: Record<string, unknown>;
  created_at: string;
};

export type TicketEvidencePayload = {
  evidence: UploadedPhotoEvidence;
  evidence_type?: "hardware_photo" | "screenshot" | "app_screenshot" | "closeup" | "other";
  actor_role?: "customer" | "staff" | "system";
  actor_name?: string;
  message?: string;
};

export type TicketFeedback = {
  id: number;
  ticket_id: string;
  issue_resolved: "yes" | "partially" | "no";
  support_rating: number;
  ai_guidance_helpful: "yes" | "somewhat" | "no";
  technician_rating?: number | null;
  comment?: string | null;
  created_at: string;
};

export type TicketRecord = {
  id: number;
  ticket_id: string;
  incident_id?: number | null;
  customer_profile: CustomerProfile;
  charger_context: ChargerContext;
  input_component: InputComponent;
  observation_result: ObservationResultV2;
  fault_type_v2: FaultTypeV2;
  recipient_type: RecipientType;
  assigned_team_id?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  ai_summary: string;
  customer_comments?: string | null;
  required_proof_next?: string | null;
  evidence_photos: UploadedPhotoEvidence[];
  triage_result?: ApiTriageResponse;
  scheduled_at?: string | null;
  scheduled_window?: string | null;
  assigned_technician?: string | null;
  technician_notes?: string | null;
  schedule_status: "not_required" | "pending" | "scheduled" | "reschedule_requested" | "completed";
  customer_confirmed_schedule: boolean;
  created_at: string;
  updated_at: string;
  events: TicketEvent[];
  feedback: TicketFeedback[];
};

export type TicketListResponse = {
  tickets: TicketRecord[];
};

export type CreateTicketResponse = {
  ticket_id: string;
  status: TicketStatus;
  priority: TicketPriority;
  ticket: TicketRecord;
};

export type WhatsAppPreview = {
  label: string;
  message: string;
  wa_url?: string | null;
};

export type ScheduleSuggestions = {
  technicians: Array<{ id: string; name: string; skills: string[]; area: string }>;
  slots: Array<{ scheduled_at: string; scheduled_window: string }>;
};

const backendAssetBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "";

export function resolveEvidenceUrl(evidenceOrPath?: UploadedPhotoEvidence | string | null) {
  if (!evidenceOrPath) return "";

  if (typeof evidenceOrPath !== "string") {
    if (evidenceOrPath.display_url) {
      if (/^https?:\/\//i.test(evidenceOrPath.display_url)) return evidenceOrPath.display_url;
      const normalizedDisplayUrl = evidenceOrPath.display_url.startsWith("/")
        ? evidenceOrPath.display_url
        : `/${evidenceOrPath.display_url}`;
      return backendAssetBase
        ? `${backendAssetBase.replace(/\/$/, "")}${normalizedDisplayUrl}`
        : normalizedDisplayUrl;
    }
    if (evidenceOrPath.storage_provider === "gcs" && evidenceOrPath.storage_key) {
      const key = evidenceOrPath.storage_key.replace(/^\/+/, "");
      return backendAssetBase
        ? `${backendAssetBase.replace(/\/$/, "")}/api/v1/evidence/${key}`
        : `/api/v1/evidence/${key}`;
    }
    evidenceOrPath = evidenceOrPath.storage_path;
  }

  const storagePath = evidenceOrPath;
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

async function patchJson<T>(url: string, payload: object): Promise<T> {
  const response = await fetch(url, {
    method: "PATCH",
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

export async function fetchTickets(filters: Record<string, string> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return getJson<TicketListResponse>(`/api/tickets${query ? `?${query}` : ""}`);
}

export async function fetchTicket(ticketId: string) {
  return getJson<TicketRecord>(`/api/tickets/${encodeURIComponent(ticketId)}`);
}

export async function createTicketFromTriage(payload: {
  incident_id?: number;
  triage_result: ApiTriageResponse;
  customer_profile: CustomerProfile;
  charger_context: ChargerContext;
  customer_comments?: string;
}) {
  return postJson<CreateTicketResponse>("/api/tickets/from-triage", payload);
}

export async function updateTicketStatus(ticketId: string, payload: {
  status: TicketStatus;
  actor_role?: "customer" | "staff" | "system";
  actor_name?: string;
  note?: string;
}) {
  return patchJson<TicketRecord>(`/api/tickets/${encodeURIComponent(ticketId)}/status`, payload);
}

export async function addTicketEvent(ticketId: string, payload: {
  event_type: string;
  actor_role?: "customer" | "staff" | "system";
  actor_name?: string;
  message: string;
  payload_json?: Record<string, unknown>;
}) {
  return postJson<TicketEvent>(`/api/tickets/${encodeURIComponent(ticketId)}/events`, payload);
}

export async function addTicketEvidence(ticketId: string, payload: TicketEvidencePayload) {
  return postJson<TicketRecord>(`/api/tickets/${encodeURIComponent(ticketId)}/evidence`, payload);
}

export async function scheduleTicket(ticketId: string, payload: {
  scheduled_at: string;
  scheduled_window: string;
  assigned_technician: string;
  actor_name?: string;
}) {
  return postJson<TicketRecord>(`/api/tickets/${encodeURIComponent(ticketId)}/schedule`, payload);
}

export async function submitTicketFeedback(ticketId: string, payload: {
  issue_resolved: "yes" | "partially" | "no";
  support_rating: number;
  ai_guidance_helpful: "yes" | "somewhat" | "no";
  technician_rating?: number;
  comment?: string;
}) {
  return postJson<TicketRecord>(`/api/tickets/${encodeURIComponent(ticketId)}/feedback`, payload);
}

export async function fetchWhatsAppPreview(ticketId: string) {
  return getJson<WhatsAppPreview>(`/api/tickets/${encodeURIComponent(ticketId)}/whatsapp-preview`);
}

export async function fetchScheduleSuggestions(ticketId: string) {
  return getJson<ScheduleSuggestions>(`/api/tickets/${encodeURIComponent(ticketId)}/schedule-suggestions`);
}

export async function fetchPreview(payload: {
  incident_id?: number;
  site_id: string;
  charger_id?: string;
  photo_evidence?: UploadedPhotoEvidence;
  app_screenshot_evidence?: UploadedPhotoEvidence;
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
  app_screenshot_evidence?: UploadedPhotoEvidence;
  photo_hint: string;
  symptom_text: string;
  error_code: string;
  follow_up_answers?: Record<string, string>;
  demo_scenario_id?: string;
}) {
  return postJson<ApiTriageResponse>("/api/triage", payload);
}

export async function uploadIncidentPhoto(file: File) {
  const uploadFile = await compressImageForUpload(file);
  const bytes = new Uint8Array(await uploadFile.arrayBuffer());
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return postJson<UploadedPhotoEvidence>("/api/uploads", {
    filename: uploadFile.name,
    media_type: uploadFile.type || "image/jpeg",
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

export function formatInstallationSource(value?: string | null) {
  switch (value) {
    case "rexharge":
      return "ChargerDoc";
    case "third_party":
      return "Third party";
    case "property_management":
      return "Property management";
    case "unknown":
    case "":
    case undefined:
    case null:
      return "Unknown";
    default:
      return titleize(value);
  }
}

export function formatHomeChargerLocation(value?: string | null) {
  switch (value) {
    case "car_porch":
      return "Car porch";
    case "garage":
      return "Garage";
    case "outdoor_wall":
      return "Outdoor wall";
    case "indoor_wall":
      return "Indoor wall";
    case "other":
      return "Other";
    case "unknown":
    case "":
    case undefined:
    case null:
      return "Not sure";
    default:
      return titleize(value);
  }
}

export function formatLocationSource(value?: string | null) {
  switch (value) {
    case "manual":
      return "Manual entry";
    case "browser_geolocation":
      return "Browser location";
    case "google_places":
      return "Google Places";
    case "reverse_geocoded":
      return "Reverse geocoded";
    case "unknown":
    case "":
    case undefined:
    case null:
      return "Not provided";
    default:
      return titleize(value);
  }
}
