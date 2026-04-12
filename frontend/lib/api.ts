export type UploadedPhotoEvidence = {
  filename: string;
  media_type: string;
  storage_path: string;
  byte_size: number;
};

export type IssueType = "no_power" | "tripping_mcb_rccb" | "charging_slow" | "not_responding";
export type BasicCheckStatus = "ok" | "problem" | "unknown";
export type WorkflowOutcome = "resolved" | "escalate";

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
    issue_type: IssueType;
    likely_fault: string;
    evidence_summary: string;
    basic_conditions: {
      main_power_supply: BasicCheckStatus;
      cable_condition: BasicCheckStatus;
      indicator_or_error_code: BasicCheckStatus;
      indicator_detail?: string | null;
    };
    raw_provider_output: string;
    raw_ocr_text?: string | null;
    confidence_score: number;
    confidence_band: "high" | "medium" | "low";
    hazard_flags: string[];
    diagnosis_source?: string;
    branch_name?: string;
    resolver_hint_final?: string | null;
    next_question_hint?: string | null;
    next_action_hint?: string | null;
    classifier_metadata?: {
      enabled: boolean;
      used: boolean;
      bypassed: boolean;
      bypass_reason?: string | null;
      model_name?: string | null;
      predicted_label?: string | null;
      predicted_probability?: number | null;
      confidence_policy_action?: string | null;
      candidate_labels: string[];
      extra?: Record<string, unknown>;
    } | null;
    ocr_metadata?: {
      extracted_text?: string | null;
      matched_rule?: string | null;
      matched_keywords: string[];
      extra?: Record<string, unknown>;
    } | null;
  };
  confidence: {
    score: number;
    band: "high" | "medium" | "low";
    requires_confirmation: boolean;
    safety_override: boolean;
    rationale: string;
  };
  workflow: {
    issue_type: IssueType;
    branch_actions: string[];
    outcome: WorkflowOutcome;
    rationale: string;
    next_action: string;
    fallback_action: string;
  };
  artifact: {
    issue_type?: IssueType;
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
  expected_issue_type: IssueType;
  expected_outcome: WorkflowOutcome;
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
  latest_issue_type?: IssueType | null;
  latest_outcome?: WorkflowOutcome | null;
  latest_fault?: string | null;
  latest_confidence_band?: "high" | "medium" | "low" | null;
};

export type IncidentHistoryDetailItem = IncidentHistoryItem & {
  follow_up_answers?: Record<string, string>;
  triage_payload?: ApiTriageResponse;
};

const backendAssetBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "";

export function resolveEvidenceUrl(storagePath?: string | null) {
  if (!storagePath) {
    return "";
  }

  const normalizedPath = storagePath.startsWith("/") ? storagePath : `/${storagePath}`;
  if (!backendAssetBase) {
    return normalizedPath;
  }

  return `${backendAssetBase.replace(/\/$/, "")}${normalizedPath}`;
}

async function postJson<T>(url: string, payload: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function postForm<T>(url: string, payload: FormData): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    body: payload,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

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
  const payload = new FormData();
  payload.append("file", file);
  return postForm<UploadedPhotoEvidence>("/api/uploads", payload);
}

export function formatIssueType(issueType?: string | null) {
  switch (issueType) {
    case "no_power":
      return "No Power";
    case "tripping_mcb_rccb":
      return "Tripping MCB/RCCB";
    case "charging_slow":
      return "Charging Slow";
    case "not_responding":
      return "Not Responding";
    default:
      return "Unknown";
  }
}

export function formatBasicCheckStatus(status?: string | null) {
  switch (status) {
    case "ok":
      return "OK";
    case "problem":
      return "Problem";
    case "unknown":
      return "Unknown";
    default:
      return "Unknown";
  }
}
