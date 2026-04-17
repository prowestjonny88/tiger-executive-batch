export type UploadedPhotoEvidence = {
  filename: string;
  media_type: string;
  storage_path: string;
  byte_size: number;
};

export type IssueFamily = "no_power" | "tripping" | "charging_slow" | "not_responding" | "unknown_mixed";
export type ResolverTier = "driver" | "local_site" | "remote_ops" | "technician";
export type HazardLevel = "low" | "medium" | "high";
export type EvidenceType = "hardware_photo" | "screenshot" | "symptom_report" | "symptom_heavy_photo" | "mixed_photo" | "unknown";

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
  diagnosis: {
    issue_family: IssueFamily;
    fault_type: string;
    evidence_type: EvidenceType;
    hazard_level: HazardLevel;
    resolver_tier: ResolverTier;
    likely_fault: string;
    evidence_summary: string;
    required_proof_next?: string | null;
    raw_provider_output: string;
    raw_ocr_text?: string | null;
    confidence_score: number;
    confidence_band: "high" | "medium" | "low";
    unknown_flag: boolean;
    requires_follow_up: boolean;
    follow_up_prompts: Array<{ question_id: string; prompt: string }>;
    diagnosis_source?: string;
    branch_name?: string;
    hazard_flags: string[];
    known_case_hit?: {
      canonical_file_name: string;
      match_score: number;
      fault_type: string;
      issue_family: IssueFamily;
      evidence_type: EvidenceType;
      hazard_level: HazardLevel;
      resolver_tier: ResolverTier;
      recommended_next_step: string;
      required_proof_next: string;
      visual_observation: string;
      engineering_rationale?: string | null;
      match_reason: string;
      component_primary?: string | null;
      visible_abnormalities: string[];
      retrieval_source: string;
    } | null;
    retrieval_metadata?: {
      provider_name: string;
      provider_mode: string;
      query_text: string;
      image_embedding_used: boolean;
      text_embedding_used: boolean;
      candidate_count: number;
      match_state: "exact_filename" | "accepted" | "weak" | "rejected";
      selected_case?: string | null;
      selected_score?: number | null;
      rejection_threshold?: number | null;
      extra?: Record<string, unknown>;
    } | null;
    confidence_reasoning?: string | null;
  };
  confidence: {
    score: number;
    band: "high" | "medium" | "low";
    requires_follow_up: boolean;
    novelty_detected: boolean;
    rationale: string;
  };
  routing: {
    issue_family: IssueFamily;
    fault_type: string;
    hazard_level: HazardLevel;
    resolver_tier: ResolverTier;
    routing_rationale: string;
    recommended_next_step: string;
    fallback_action: string;
    required_proof_next?: string | null;
    escalation_required: boolean;
  };
  artifact: {
    issue_family: IssueFamily;
    resolver_tier: ResolverTier;
    title: string;
    summary?: string;
    steps: string[];
    safety_note: string;
    evidence_focus?: string[];
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
  follow_up_questions: Array<{ question_id: string; prompt: string }>;
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
  expected_issue_family: IssueFamily;
  expected_resolver_tier: ResolverTier;
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
  latest_issue_family?: IssueFamily | null;
  latest_resolver_tier?: ResolverTier | null;
  latest_fault?: string | null;
  latest_confidence_band?: "high" | "medium" | "low" | null;
  latest_hazard_level?: HazardLevel | null;
  latest_diagnosis_source?: string | null;
  latest_retrieval_provider?: string | null;
  latest_known_case?: string | null;
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

export function formatIssueType(issueFamily?: string | null) {
  switch (issueFamily) {
    case "no_power":
      return "No Power";
    case "tripping":
      return "Tripping";
    case "charging_slow":
      return "Charging Slow";
    case "not_responding":
      return "Not Responding";
    case "unknown_mixed":
      return "Unknown / Mixed";
    default:
      return "Unknown";
  }
}

export function formatResolverTier(resolverTier?: string | null) {
  switch (resolverTier) {
    case "driver":
      return "Driver";
    case "local_site":
      return "Local Site";
    case "remote_ops":
      return "Remote Ops";
    case "technician":
      return "Technician";
    default:
      return "Unknown";
  }
}

export function formatHazardLevel(hazardLevel?: string | null) {
  switch (hazardLevel) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default:
      return "Unknown";
  }
}
