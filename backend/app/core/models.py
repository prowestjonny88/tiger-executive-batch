from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

# Categorizes faults (no_power, tripping_mcb_rccb, charging_slow, not_responding)
IssueType = Literal["no_power", "tripping_mcb_rccb", "charging_slow", "not_responding"]

# Assessment results (ok, problem, unknown)
BasicCheckStatus = Literal["ok", "problem", "unknown"]

# Resolution paths (resolved, escalate)
WorkflowOutcome = Literal["resolved", "escalate"]

# Confidence levels (high, medium, low)
class ConfidenceBand(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

# --- Enums --- #
# Issue severity (low, moderate, high, critical)
class SeverityLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


# Captures evidence photos attached to EV charger fault reports. 
class PhotoEvidence(BaseModel):
    filename: str
    media_type: str = "image/jpeg"
    storage_path: str  # Retrieve the image for OCR or ML classification
    byte_size: int = Field(ge=0)
    quality_status: Literal["usable", "weak", "retake_required"]   # Decide whether to process the image or request a retake
    notes: List[str] = Field(default_factory=list)

# --- Core Models --- #
# Handles photo documentation with metadata
class StoredPhotoEvidence(BaseModel):
    filename: str
    media_type: str = "image/jpeg"
    storage_path: str
    byte_size: int = Field(ge=0)


# The incoming payload when a user uploads a photo
'''
The Base64 encoding allows binary image data to be safely transmitted as JSON. 
Once received by the backend, this data would typically be:
    1. Decoded from Base64
    2. Validated (format, size)
    3. Stored using the storage_path mechanism from StoredPhotoEvidence
    4. Used for OCR or ML classification to diagnose EV charger faults
'''
class UploadedPhotoPayload(BaseModel):
    filename: str
    media_type: str
    content_base64: str


# Captures follow-up diagnostic questions in the EV charger triage system.
'''
Example flow:
    1. User reports a charger fault
    2. System asks: "Is the main power supply on?" → stored in prompt
    3. User answers: "no" → stored in answer
    4. This exchange gets wrapped in SymptomAnswer with a question_id like "power_check"
    5. Multiple SymptomAnswer objects are collected in the follow_up_answers dictionary within IncidentInput

    Purpose: These answers help the system refine its diagnosis by gathering more specific information 
             about the charger's state, leading to more accurate fault classification.
'''
class SymptomAnswer(BaseModel):
    question_id: str
    prompt: str
    answer: str


# Captures incident details (site/charger ID, symptoms, error codes, follow-up answers)
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


'''
Represents the initial troubleshooting checklist before running advanced diagnostics. 
It captures basic manual observations about the charger's state.

Purpose: These basic checks help narrow down the fault quickly before invoking expensive 
         ML classifiers or OCR processing. 
         It's included in DiagnosisResult to document the physical condition assessment.
'''
class BasicConditionsAssessment(BaseModel):
    main_power_supply: BasicCheckStatus = "unknown"
    cable_condition: BasicCheckStatus = "unknown"
    indicator_or_error_code: BasicCheckStatus = "unknown"
    indicator_detail: Optional[str] = None


# Tracks the ML classifier's decision-making process for transparency and auditing
# It answers questions like:
'''
    a. Was a machine learning model used?
    b. What did it predict and with what confidence?
    c. Was it overridden? Why?
    d. What were the alternatives?
'''
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


'''
When a user uploads a photo of a faulty charger, 
the system uses OCR to read any visible text/error codes on the charger's display. 
This metadata captures what was found.
'''
class OcrMetadata(BaseModel):
    extracted_text: Optional[str] = None
    matched_rule: Optional[str] = None
    matched_keywords: List[str] = Field(default_factory=list)
    extra: Dict[str, Any] = Field(default_factory=dict)


# Main diagnostic output with issue type, confidence score, severity, and metadata
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


''' 
Captures the system's uncertainty and risk assessment for each diagnosis in the EV charger triage workflow.

Purpose: Helps the system decide whether to auto-resolve issues or 
         escalate to human operators for safety-critical decisions.
'''
class ConfidenceAssessment(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    band: ConfidenceBand
    requires_confirmation: bool
    safety_override: bool
    rationale: str


# Describes the infrastructure and support capabilities available at each charging location
class SiteCapabilityProfile(BaseModel):
    site_id: str
    site_name: str
    charger_id: str
    charger_label: str
    has_local_resolver: bool
    has_remote_ops: bool
    notes: Optional[str] = None

# Determines next actions and outcomes based on diagnosis
class WorkflowDecision(BaseModel):
    issue_type: IssueType
    branch_actions: List[str]
    outcome: WorkflowOutcome
    rationale: str
    next_action: str
    fallback_action: str

# Provides diagnostic steps, summaries, and safety notes
class ActionArtifact(BaseModel):
    issue_type: IssueType
    title: str
    summary: str
    steps: List[str]
    safety_note: str
    evidence_focus: List[str] = Field(default_factory=list)

# Stores reusable diagnostic knowledge that can be retrieved and presented to users or 
# used to guide the system's decision-making.
class KnowledgeSnippet(BaseModel):
    snippet_id: str
    issue_type: IssueType
    keywords: List[str]
    title: str
    body: List[str]

# Aggregates incident, diagnosis, confidence, workflow, and action into a complete result
class TriageResult(BaseModel):
    incident: IncidentInput
    diagnosis: DiagnosisResult
    confidence: ConfidenceAssessment
    workflow: WorkflowDecision
    artifact: ActionArtifact

# Test case data structure
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

'''
The system appears to be a triage/diagnostic workflow for EV charging issues, 
combining manual input (symptoms, photos, error codes) 
with AI-powered classification and decision-making.
'''
