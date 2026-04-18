from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

IssueFamily = Literal["no_power", "tripping", "charging_slow", "not_responding", "unknown_mixed"]
HazardLevel = Literal["low", "medium", "high"]
ResolverTier = Literal["driver", "local_site", "remote_ops", "technician"]
EvidenceType = Literal["hardware_photo", "screenshot", "symptom_report", "symptom_heavy_photo", "mixed_photo", "unknown"]
KbGateDecision = Literal["accepted", "contextual_only", "rejected"]


class ConfidenceBand(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


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


class DatasetEvidencePoint(BaseModel):
    label: str
    role: str
    notes: Optional[str] = None


class KnownCaseHit(BaseModel):
    canonical_file_name: str
    match_score: float = Field(ge=0.0, le=1.0)
    fault_type: str
    issue_family: IssueFamily
    evidence_type: EvidenceType
    hazard_level: HazardLevel
    resolver_tier: ResolverTier
    recommended_next_step: str
    required_proof_next: str
    visual_observation: str
    engineering_rationale: Optional[str] = None
    match_reason: str
    component_primary: Optional[str] = None
    visible_abnormalities: List[str] = Field(default_factory=list)
    retrieval_source: str = "package_seed"


class RetrievalMetadata(BaseModel):
    provider_name: str
    provider_mode: str
    query_text: str
    image_embedding_used: bool = False
    text_embedding_used: bool = False
    candidate_count: int = 0
    match_state: Literal["exact_filename", "accepted", "weak", "rejected"] = "rejected"
    selected_case: Optional[str] = None
    selected_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    rejection_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    extra: Dict[str, Any] = Field(default_factory=dict)


class PerceptionResult(BaseModel):
    mode: Literal["vlm", "heuristic", "text_only"]
    evidence_type: EvidenceType
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


class StructuredEvidence(BaseModel):
    evidence_type: EvidenceType
    human_summary: str
    retrieval_text: str
    components_visible: List[str] = Field(default_factory=list)
    visible_abnormalities: List[str] = Field(default_factory=list)
    ocr_findings: List[str] = Field(default_factory=list)
    hazard_signals: List[str] = Field(default_factory=list)
    user_symptoms: List[str] = Field(default_factory=list)
    user_error_code: Optional[str] = None
    follow_up_context: Dict[str, str] = Field(default_factory=dict)
    missing_evidence: List[str] = Field(default_factory=list)
    incomplete: bool = False


class KbCandidateHit(BaseModel):
    canonical_file_name: str
    match_score: float = Field(ge=0.0, le=1.0)
    compatibility_score: float = Field(ge=0.0, le=1.0)
    fault_type: str
    issue_family: IssueFamily
    evidence_type: EvidenceType
    hazard_level: HazardLevel
    resolver_tier: ResolverTier
    recommended_next_step: str
    required_proof_next: str
    visual_observation: str
    engineering_rationale: Optional[str] = None
    match_reason: str
    component_primary: Optional[str] = None
    visible_abnormalities: List[str] = Field(default_factory=list)
    retrieval_source: str = "package_seed"
    text_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    image_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    compatibility_notes: List[str] = Field(default_factory=list)


class KbRetrievalResult(BaseModel):
    query_text: str
    provider_name: str
    provider_mode: str
    gate_decision: KbGateDecision
    gate_basis: str
    candidate_count: int = 0
    primary_candidate: Optional[KbCandidateHit] = None
    candidates: List[KbCandidateHit] = Field(default_factory=list)
    rejection_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    weak_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    image_embedding_used: bool = False
    text_embedding_used: bool = False
    top_family_consensus: List[IssueFamily] = Field(default_factory=list)
    score_margin_top2: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    stable_neighborhood: bool = False
    compatibility_notes: List[str] = Field(default_factory=list)
    extra: Dict[str, Any] = Field(default_factory=dict)


class DiagnosisResult(BaseModel):
    raw_provider_output: str
    issue_family: IssueFamily
    fault_type: str
    evidence_type: EvidenceType
    hazard_level: HazardLevel
    resolver_tier_proposed: ResolverTier
    likely_fault: str
    evidence_summary: str
    required_proof_next: Optional[str] = None
    raw_ocr_text: Optional[str] = None
    confidence_score: float = Field(ge=0.0, le=1.0)
    confidence_band: ConfidenceBand
    unknown_flag: bool = False
    requires_follow_up: bool = False
    follow_up_prompts: List[Dict[str, str]] = Field(default_factory=list)
    diagnosis_source: str = "heuristic"
    branch_name: str = "round1_live_path"
    hazard_flags: List[str] = Field(default_factory=list)
    known_case_hit: Optional[KnownCaseHit] = None
    retrieval_metadata: Optional[RetrievalMetadata] = None
    confidence_reasoning: Optional[str] = None
    novelty_flag: bool = False
    known_case_match_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    reasoning_notes: List[str] = Field(default_factory=list)


class ConfidenceAssessment(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    band: ConfidenceBand
    requires_follow_up: bool
    novelty_detected: bool
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
    issue_family: IssueFamily
    fault_type: str
    hazard_level: HazardLevel
    resolver_tier: ResolverTier
    resolver_decision: Literal["confirmed", "overridden"]
    resolver_override_reason: Optional[str] = None
    routing_rationale: str
    recommended_next_step: str
    fallback_action: str
    required_proof_next: Optional[str] = None
    escalation_required: bool = False


class ActionArtifact(BaseModel):
    issue_family: IssueFamily
    resolver_tier: ResolverTier
    title: str
    summary: str
    steps: List[str]
    safety_note: str
    evidence_focus: List[str] = Field(default_factory=list)


class KnowledgeSnippet(BaseModel):
    snippet_id: str
    issue_family: IssueFamily
    resolver_tier: Optional[ResolverTier] = None
    keywords: List[str]
    title: str
    body: List[str]


class TriageResult(BaseModel):
    incident: IncidentInput
    perception: PerceptionResult
    kb_retrieval: KbRetrievalResult
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
    expected_issue_family: IssueFamily
    expected_resolver_tier: ResolverTier
