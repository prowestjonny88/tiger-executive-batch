from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_ROOT = REPO_ROOT / "frontend"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_result_field_builder_uses_component_specific_evidence_cards():
    source = _read(FRONTEND_ROOT / "lib" / "theme2-result-fields.ts")

    assert "buildCoreOrganizerOutputFields" in source
    assert "buildComponentEvidenceFields" in source
    assert "isEvdbSpecCompleteAndCorrect" in source
    assert 'output.input_component === "charger"' in source
    assert 'output.input_component === "evdb"' in source
    assert 'output.input_component === "isolator"' in source
    assert '"Charger Serial Number"' in source
    assert '"Brand / Model"' in source
    assert '"MCB Evidence"' in source
    assert '"RCCB Evidence"' in source
    assert '"EVDB Spec Status"' in source
    assert '"Correct specs verified"' in source
    assert '"Correct specs readable"' not in source
    assert '"Readable but needs verification"' in source
    assert '"Switch State"' in source


def test_result_state_utility_centralizes_verdict_cta_and_next_step():
    source = _read(FRONTEND_ROOT / "lib" / "theme2-result-state.ts")

    assert "deriveResultState" in source
    assert "proofState" in source
    assert "primaryCtaLabel" in source
    assert "primaryCtaHref" in source
    assert "nextStep" in source
    assert "recipientHelper" in source
    assert "isEvdbSpecCompleteAndCorrect" in source
    assert '"View Verification Guidance"' in source


def test_result_page_uses_safe_hierarchy_and_collapsed_internal_trace():
    source = _read(FRONTEND_ROOT / "app" / "result" / "page.tsx")

    assert "ResultVerdictCard" in source
    assert "buildCoreOrganizerOutputFields" in source
    assert "buildComponentEvidenceFields" in source
    assert "deriveResultState" in source
    assert "resultState.nextStep" in source
    assert "resultState.primaryCtaLabel" in source
    assert "resultState.primaryCtaHref" in source
    assert "Result Summary" in source
    assert "Theme 2 required output" in source
    assert "Component Evidence" in source
    assert "Show routing decision trace" in source
    assert source.index("Show routing decision trace") < source.rindex("<DecisionChain")
    assert "Advanced Debug Info" in source
    assert "For development and judging audit only." in source
    assert "triage.perception.extraction.bounding_boxes ?? []" in source
    assert "ConfidencePill" not in source
    assert '"Charger Serial Number"' not in source
    assert '"Brand / Model"' not in source


def test_evidence_panel_accepts_theme2_object_annotations():
    source = _read(FRONTEND_ROOT / "components" / "triage" / "evidence-panel.tsx")

    assert "type Annotation" in source
    assert "annotations?: Annotation[]" in source
    assert "annotations={annotations}" in source
    assert "Detected components used for visual assessment. Clearer close-ups may be required for label verification." in source
    assert "No visual boxes returned. The image was still used for VLM assessment." in source


def test_proof_required_card_uses_verification_language_and_evdb_filter():
    source = _read(FRONTEND_ROOT / "components" / "triage" / "proof-required-card.tsx")

    assert "More proof needed" in source
    assert "suppressGenericEvdbProof" in source
    assert "resultProofState" in source
    assert "evdb_label_closeup" in source


def test_result_page_supports_optional_ev_app_screenshot_upload():
    source = _read(FRONTEND_ROOT / "app" / "result" / "page.tsx")

    assert "charger_app_screenshot" in source
    assert "app_screenshot_evidence" in source
    assert "Add App Screenshot" in source
    assert "uploadIncidentPhoto" in source
    assert "fetchTriage" in source


def test_frontend_theme2_files_do_not_contain_mojibake_or_problem_separators():
    bad_sequences = [
        "".join(chr(code) for code in [0x00E2, 0x20AC, 0x201D]),
        "".join(chr(code) for code in [0x00E2, 0x20AC, 0x00A2]),
        chr(0x2014),
        chr(0x2022),
    ]
    scanned_paths = [
        FRONTEND_ROOT / "app" / "result" / "page.tsx",
        FRONTEND_ROOT / "app" / "history" / "page.tsx",
        FRONTEND_ROOT / "components" / "triage" / "evidence-panel.tsx",
        FRONTEND_ROOT / "components" / "triage" / "follow-up-control.tsx",
        FRONTEND_ROOT / "components" / "triage" / "result-verdict-card.tsx",
        FRONTEND_ROOT / "components" / "triage" / "confidence-pill.tsx",
        FRONTEND_ROOT / "lib" / "theme2-result-fields.ts",
        FRONTEND_ROOT / "lib" / "theme2-result-state.ts",
    ]

    for path in scanned_paths:
        source = _read(path)
        for sequence in bad_sequences:
            assert sequence not in source
