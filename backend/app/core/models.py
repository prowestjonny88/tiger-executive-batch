from __future__ import annotations

from enum import Enum
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

ResolverTier = Literal["driver", "local_site_resolver", "remote_ops", "technician"]


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


class DiagnosisResult(BaseModel):
    raw_provider_output: str
    internal_issue_category: str
    likely_fault: str
    evidence_summary: str
    raw_ocr_text: Optional[str] = None
    confidence_score: float = Field(ge=0.0, le=1.0)
    confidence_band: ConfidenceBand
    unknown_flag: bool = False
    severity: SeverityLevel
    hazard_flags: List[str] = Field(default_factory=list)


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


class RoutingDecision(BaseModel):
    resolver_tier: ResolverTier
    priority: SeverityLevel
    rationale: str
    next_action: str
    fallback_action: str


class ActionArtifact(BaseModel):
    resolver_tier: ResolverTier
    title: str
    summary: str
    steps: List[str]
    safety_note: str
    evidence_focus: List[str] = Field(default_factory=list)


class KnowledgeSnippet(BaseModel):
    snippet_id: str
    issue_category: str
    resolver_tier: str
    keywords: List[str]
    title: str
    body: List[str]


class TriageResult(BaseModel):
    incident: IncidentInput
    diagnosis: DiagnosisResult
    confidence: ConfidenceAssessment
    routing: RoutingDecision
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
    expected_tier: ResolverTier
