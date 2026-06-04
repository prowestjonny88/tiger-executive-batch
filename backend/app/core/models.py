from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

EvidenceType = Literal["hardware_photo", "screenshot", "symptom_report", "symptom_heavy_photo", "mixed_photo", "unknown"]
InputComponent = Literal["charger", "evdb", "isolator", "unknown"]
ObservationResultV2 = Literal[
    "charger_red_light",
    "charger_blinking_red_light",
    "charger_no_light",
    "charger_serial_brand_visible",
    "evdb_single_phase",
    "evdb_three_phase",
    "mcb_tripped",
    "missing_mcb_rccb",
    "wrong_component_specs",
    "isolator_on",
    "isolator_off_open_circuit",
    "unknown",
]
FaultTypeV2 = Literal[
    "protection_issue",
    "charger_issue",
    "supply_issue",
    "installation_issue",
    "manual_error",
    "power_cut",
    "identification_only",
    "unknown",
]
RecipientType = Literal["customer", "after_sales_team", "none", "unknown"]
TicketPriority = Literal["Critical", "High", "Medium", "Low"]
TicketStatus = Literal[
    "submitted",
    "triaged",
    "waiting_customer",
    "assigned",
    "scheduled",
    "reschedule_requested",
    "in_progress",
    "resolved",
    "closed",
    "cancelled",
    "reopened",
]
ScheduleStatus = Literal["not_required", "pending", "scheduled", "reschedule_requested", "completed"]
ActorRole = Literal["customer", "staff", "system"]


class PhotoEvidence(BaseModel):
    filename: str
    media_type: str = "image/jpeg"
    storage_path: str
    byte_size: int = Field(ge=0)
    quality_status: Literal["usable", "weak", "retake_required"]
    notes: List[str] = Field(default_factory=list)


class StoredPhotoEvidence(BaseModel):
    filename: str
    media_type: str = "image/jpeg"
    storage_path: str
    byte_size: int = Field(ge=0)
    storage_provider: Literal["local", "gcs"] = "local"
    storage_key: Optional[str] = None
    display_url: Optional[str] = None


class UploadedPhotoPayload(BaseModel):
    filename: str
    media_type: str
    content_base64: str


class IncidentInput(BaseModel):
    incident_id: Optional[int] = None
    site_id: str
    charger_id: Optional[str] = None
    photo_evidence: Optional[StoredPhotoEvidence] = None
    app_screenshot_evidence: Optional[StoredPhotoEvidence] = None
    photo_hint: Optional[str] = None
    symptom_text: Optional[str] = None
    error_code: Optional[str] = None
    follow_up_answers: Dict[str, str] = Field(default_factory=dict)
    demo_scenario_id: Optional[str] = None


class Theme2BoundingBox(BaseModel):
    id: str
    label: str
    x: float = Field(ge=0.0, le=100.0)
    y: float = Field(ge=0.0, le=100.0)
    width: float = Field(ge=1.0, le=100.0)
    height: float = Field(ge=1.0, le=100.0)
    source: Literal["vlm", "heuristic"] = "vlm"


class Theme2VisualExtraction(BaseModel):
    input_component: InputComponent = "unknown"
    observation_result: ObservationResultV2 = "unknown"
    charger_serial_number: Optional[str] = None
    charger_brand_model: Optional[str] = None
    indicator_status: Literal["red_light", "blinking_red_light", "no_light", "unknown"] = "unknown"
    evdb_phase_type: Literal["single_phase", "three_phase", "unknown"] = "unknown"
    mcb_visible: Optional[bool] = None
    rccb_visible: Optional[bool] = None
    mcb_rating: Optional[str] = None
    rccb_rating: Optional[str] = None
    mcb_current_amp: Optional[int] = None
    rccb_current_amp: Optional[int] = None
    mcb_poles: Literal["1p", "2p", "3p", "4p", "unknown"] = "unknown"
    rccb_poles: Literal["1p", "2p", "3p", "4p", "unknown"] = "unknown"
    mcb_brand_model: Optional[str] = None
    rccb_brand_model: Optional[str] = None
    rccb_type: Literal["type_a", "type_ac", "unknown"] = "unknown"
    rccb_type_evidence: Literal["text_label", "symbol_only", "mixed", "unknown"] = "unknown"
    rccb_symbol_description: Optional[str] = None
    charger_brand_source: Literal["text_label", "logo_text", "mixed", "unknown"] = "unknown"
    evdb_spec_status: Literal["correct", "wrong", "missing", "incomplete", "unknown"] = "unknown"
    isolator_state: Literal["on", "off", "unknown"] = "unknown"
    raw_visible_text: List[str] = Field(default_factory=list)
    bounding_boxes: List[Theme2BoundingBox] = Field(default_factory=list)
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    uncertainty_notes: List[str] = Field(default_factory=list)


class Theme2PerceptionAssessment(BaseModel):
    mode: Literal["vlm", "heuristic", "text_only"]
    evidence_type: EvidenceType = "unknown"
    scene_summary: str
    components_visible: List[str] = Field(default_factory=list)
    visible_abnormalities: List[str] = Field(default_factory=list)
    ocr_findings: List[str] = Field(default_factory=list)
    hazard_signals: List[str] = Field(default_factory=list)
    uncertainty_notes: List[str] = Field(default_factory=list)
    confidence_score: float = Field(ge=0.0, le=1.0)
    requires_follow_up: bool = False
    provider_attempted: bool = False
    fallback_used: bool = False
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    raw_provider_output: Optional[str] = None
    extraction: Theme2VisualExtraction = Field(default_factory=Theme2VisualExtraction)


class CompetitionOutput(BaseModel):
    input_component: InputComponent
    observation_result: ObservationResultV2
    charger_serial_number: Optional[str] = None
    charger_brand_model: Optional[str] = None
    fault_type_v2: FaultTypeV2
    recipient_type: RecipientType
    assigned_team_id: Optional[str] = None
    action_message: str
    required_proof_next: Optional[str] = None
    confidence_score: float = Field(ge=0.0, le=1.0)
    evidence_notes: List[str] = Field(default_factory=list)
    source: Literal["theme2_rule_mapper", "fallback"] = "theme2_rule_mapper"


class Theme2FollowUpPrompt(BaseModel):
    question_id: str
    prompt: str
    reason: Optional[str] = None


class Theme2DebugInfo(BaseModel):
    perception_mode: str
    provider_attempted: bool
    fallback_used: bool
    raw_provider_output: Optional[str] = None
    rule_version: Optional[str] = None
    rule_key: Optional[str] = None
    error_log_key: Optional[str] = None
    folder_weak_label: Optional[str] = None
    extra: Dict[str, Any] = Field(default_factory=dict)


class Theme2TriageResult(BaseModel):
    incident: IncidentInput
    perception: Theme2PerceptionAssessment
    competition_output: CompetitionOutput
    follow_up_prompts: List[Theme2FollowUpPrompt] = Field(default_factory=list)
    debug: Theme2DebugInfo


class SiteCapabilityProfile(BaseModel):
    site_id: str
    site_name: str
    charger_id: str
    charger_label: str
    has_local_resolver: bool
    has_remote_ops: bool
    notes: Optional[str] = None


class DemoScenario(BaseModel):
    scenario_id: str
    name: str
    site_id: str
    headline: str
    photo_hint: str
    symptom_text: str
    error_code: str = ""
    follow_up_answers: Dict[str, str] = Field(default_factory=dict)
    expected_input_component: InputComponent
    expected_observation_result: ObservationResultV2
    expected_fault_type_v2: FaultTypeV2
    expected_recipient_type: RecipientType


class CustomerProfile(BaseModel):
    full_name: str
    phone_number: str
    whatsapp_number: str
    email: str
    preferred_contact_method: Literal["whatsapp", "phone", "email"] = "whatsapp"


class ChargerContext(BaseModel):
    installation_address: str
    customer_type: Literal["home", "condo", "commercial", "public_site", "unknown"] = "unknown"
    installed_by: Literal["rexharge", "third_party", "property_management", "unknown"] = "unknown"
    installer_name: Optional[str] = None
    charger_serial_number: Optional[str] = None
    charger_brand_model: Optional[str] = None
    symptom_text: Optional[str] = None
    error_code: Optional[str] = None


class TicketFromTriageRequest(BaseModel):
    incident_id: Optional[int] = None
    triage_result: Dict[str, Any]
    customer_profile: CustomerProfile
    charger_context: ChargerContext
    customer_comments: Optional[str] = None


class TicketStatusUpdateRequest(BaseModel):
    status: TicketStatus
    actor_role: ActorRole = "staff"
    actor_name: Optional[str] = "Demo Staff"
    note: Optional[str] = None


class TicketEventCreateRequest(BaseModel):
    event_type: str
    actor_role: ActorRole = "staff"
    actor_name: Optional[str] = "Demo Staff"
    message: str
    payload_json: Dict[str, Any] = Field(default_factory=dict)


class TicketScheduleRequest(BaseModel):
    scheduled_at: str
    scheduled_window: str
    assigned_technician: str
    actor_name: Optional[str] = "Demo Staff"


class TicketFeedbackRequest(BaseModel):
    issue_resolved: Literal["yes", "partially", "no"]
    support_rating: int = Field(ge=1, le=5)
    ai_guidance_helpful: Literal["yes", "somewhat", "no"]
    technician_rating: Optional[int] = Field(default=None, ge=1, le=5)
    comment: Optional[str] = None


class TicketRecord(BaseModel):
    id: int
    ticket_id: str
    incident_id: Optional[int] = None
    customer_profile: Dict[str, Any]
    charger_context: Dict[str, Any]
    input_component: InputComponent
    observation_result: ObservationResultV2
    fault_type_v2: FaultTypeV2
    recipient_type: RecipientType
    assigned_team_id: Optional[str] = None
    priority: TicketPriority
    status: TicketStatus
    ai_summary: str
    customer_comments: Optional[str] = None
    required_proof_next: Optional[str] = None
    evidence_photos: List[Dict[str, Any]] = Field(default_factory=list)
    triage_result: Dict[str, Any] = Field(default_factory=dict)
    scheduled_at: Optional[str] = None
    scheduled_window: Optional[str] = None
    assigned_technician: Optional[str] = None
    technician_notes: Optional[str] = None
    schedule_status: ScheduleStatus = "not_required"
    customer_confirmed_schedule: bool = False
    created_at: Any
    updated_at: Any
    events: List[Dict[str, Any]] = Field(default_factory=list)
    feedback: List[Dict[str, Any]] = Field(default_factory=list)


class TicketListResponse(BaseModel):
    tickets: List[TicketRecord]
