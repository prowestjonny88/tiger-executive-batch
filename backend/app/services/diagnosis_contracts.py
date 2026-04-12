from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.core.models import BasicConditionsAssessment, IssueType, SeverityLevel


@dataclass
class DiagnosisProviderResponse:
    provider_summary: str
    issue_type: IssueType
    likely_fault: str
    confidence_score: float
    raw_ocr_text: str
    severity: SeverityLevel
    basic_conditions: BasicConditionsAssessment
    hazard_flags: list[str] = field(default_factory=list)
    diagnosis_source: str = "heuristic"
    branch_name: str = "heuristic_fallback"
    resolver_hint_final: str | None = None
    next_question_hint: str | None = None
    next_action_hint: str | None = None
    classifier_metadata: dict[str, Any] | None = None
    ocr_metadata: dict[str, Any] | None = None
