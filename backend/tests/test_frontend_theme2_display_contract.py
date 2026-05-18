from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_ROOT = REPO_ROOT / "frontend"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_result_field_builder_uses_component_specific_evidence_cards():
    source = _read(FRONTEND_ROOT / "lib" / "theme2-result-fields.ts")

    assert 'output.input_component === "charger"' in source
    assert 'output.input_component === "evdb"' in source
    assert 'output.input_component === "isolator"' in source
    assert '"Charger Serial Number"' in source
    assert '"Brand / Model"' in source
    assert '"MCB Evidence"' in source
    assert '"RCCB Evidence"' in source
    assert '"EVDB Spec Status"' in source
    assert '"Switch State"' in source


def test_result_page_delegates_organizer_fields_to_builder():
    source = _read(FRONTEND_ROOT / "app" / "result" / "page.tsx")

    assert "buildOrganizerOutputFields" in source
    assert "organizerFields.map" in source
    assert "triage.perception.extraction.bounding_boxes ?? []" in source
    assert '"Charger Serial Number"' not in source
    assert '"Brand / Model"' not in source


def test_evidence_panel_accepts_theme2_object_annotations():
    source = _read(FRONTEND_ROOT / "components" / "triage" / "evidence-panel.tsx")

    assert "type Annotation" in source
    assert "annotations?: Annotation[]" in source
    assert "annotations={annotations}" in source
    assert "Highlighted object evidence" in source


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
        FRONTEND_ROOT / "components" / "triage" / "confidence-pill.tsx",
        FRONTEND_ROOT / "lib" / "theme2-result-fields.ts",
    ]

    for path in scanned_paths:
        source = _read(path)
        for sequence in bad_sequences:
            assert sequence not in source
