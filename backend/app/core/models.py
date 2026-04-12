from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

IssueType = Literal["no_power", "tripping_mcb_rccb", "charging_slow", "not_responding"]
BasicCheckStatus = Literal["ok", "problem", "unknown"]
WorkflowOutcome = Literal["resolved", "escalate"]


class ConfidenceBand(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class SeverityLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


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


class UploadedPhotoPayload(BaseModel):
    filename: str
    media_type: str
    content_base64: str


class SymptomAnswer(BaseModel):
    question_id: str
    prompt: str
    answer: str


class IncidentInput(BaseModel):
    incident_id: Optional[int] = None
    site_id: str
    charger_id: Optional[str] = None
    photo_evidence: Optional[StoredPhotoEvidence] = None
    photo_hint: Optional[str] = None
    symptom_text: Optional[str] = None
    error_code: Optional[str] = None
    follow_up_answers: Dict[str, str] = Field(default_factory=dict)
    demo_scenario_id: Optional[str] = None


class BasicConditionsAssessment(BaseModel):
    main_power_supply: BasicCheckStatus = "unknown"
    cable_condition: BasicCheckStatus = "unknown"
    indicator_or_error_code: BasicCheckStatus = "unknown"
    indicator_detail: Optional[str] = None


class ClassifierMetadata(BaseModel):
    enabled: bool = False
    used: bool = False
    bypassed: bool = False
    bypass_reason: Optional[str] = None
    model_name: Optional[str] = None
    predicted_label: Optional[str] = None
    predicted_probability: Optional[float] = None
    confidence_policy_action: Optional[str] = None
    candidate_labels: List[str] = Field(default_factory=list)
    extra: Dict[str, Any] = Field(default_factory=dict)


class OcrMetadata(BaseModel):
    extracted_text: Optional[str] = None
    matched_rule: Optional[str] = None
    matched_keywords: List[str] = Field(default_factory=list)
    extra: Dict[str, Any] = Field(default_factory=dict)


class DiagnosisResult(BaseModel):
    raw_provider_output: str
    issue_type: IssueType
    likely_fault: str
    evidence_summary: str
    basic_conditions: BasicConditionsAssessment
    raw_ocr_text: Optional[str] = None
    confidence_score: float = Field(ge=0.0, le=1.0)
    confidence_band: ConfidenceBand
    unknown_flag: bool = False
    severity: SeverityLevel
    hazard_flags: List[str] = Field(default_factory=list)
    diagnosis_source: str = "heuristic"
    branch_name: str = "heuristic_fallback"
    resolver_hint_final: Optional[str] = None
    next_question_hint: Optional[str] = None
    next_action_hint: Optional[str] = None
    classifier_metadata: Optional[ClassifierMetadata] = None
    ocr_metadata: Optional[OcrMetadata] = None


class ConfidenceAssessment(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    band: ConfidenceBand
    requires_confirmation: bool
    safety_override: bool
    rationale: str


class SiteCapabilityProfile(BaseModel):
    site_id: str
    site_name: str
    charger_id: str
    charger_label: str
    has_local_resolver: bool
    has_remote_ops: bool
    notes: Optional[str] = None


class WorkflowDecision(BaseModel):
    issue_type: IssueType
    branch_actions: List[str]
    outcome: WorkflowOutcome
    rationale: str
    next_action: str
    fallback_action: str


class ActionArtifact(BaseModel):
    issue_type: IssueType
    title: str
    summary: str
    steps: List[str]
    safety_note: str
    evidence_focus: List[str] = Field(default_factory=list)


class KnowledgeSnippet(BaseModel):
    snippet_id: str
    issue_type: IssueType
    keywords: List[str]
    title: str
    body: List[str]


class TriageResult(BaseModel):
    incident: IncidentInput
    diagnosis: DiagnosisResult
    confidence: ConfidenceAssessment
    workflow: WorkflowDecision
    artifact: ActionArtifact


class DemoScenario(BaseModel):
    scenario_id: str
    name: str
    site_id: str
    headline: str
    photo_hint: str
    symptom_text: str
    error_code: str
    follow_up_answers: Dict[str, str]
    expected_issue_type: IssueType
    expected_outcome: WorkflowOutcome
