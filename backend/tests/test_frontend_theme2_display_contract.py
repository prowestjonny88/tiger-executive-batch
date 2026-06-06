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


def test_annotated_image_uses_rendered_image_rectangle_for_boxes():
    source = _read(FRONTEND_ROOT / "components" / "ui" / "annotated-image.tsx")

    assert "ResizeObserver" in source
    assert "naturalWidth" in source
    assert "naturalHeight" in source
    assert "renderedImageRect" in source
    assert "(ann.x / 100) * renderedImageRect.width" in source
    assert "(ann.y / 100) * renderedImageRect.height" in source


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


def test_ticket_routes_and_role_flows_exist():
    expected_paths = [
        FRONTEND_ROOT / "app" / "login" / "page.tsx",
        FRONTEND_ROOT / "app" / "customer" / "dashboard" / "page.tsx",
        FRONTEND_ROOT / "app" / "customer" / "new-ticket" / "page.tsx",
        FRONTEND_ROOT / "app" / "customer" / "tickets" / "[ticketId]" / "page.tsx",
        FRONTEND_ROOT / "app" / "staff" / "dashboard" / "page.tsx",
        FRONTEND_ROOT / "app" / "staff" / "tickets" / "[ticketId]" / "page.tsx",
        FRONTEND_ROOT / "app" / "staff" / "history" / "page.tsx",
        FRONTEND_ROOT / "app" / "api" / "tickets" / "route.ts",
        FRONTEND_ROOT / "app" / "api" / "tickets" / "from-triage" / "route.ts",
        FRONTEND_ROOT / "app" / "api" / "tickets" / "[ticketId]" / "evidence" / "route.ts",
    ]

    for path in expected_paths:
        assert path.exists()

    api_source = _read(FRONTEND_ROOT / "lib" / "api.ts")
    assert "createTicketFromTriage" in api_source
    assert "fetchTickets" in api_source
    assert "updateTicketStatus" in api_source
    assert "scheduleTicket" in api_source
    assert "submitTicketFeedback" in api_source
    assert "addTicketEvidence" in api_source


def test_customer_ticket_page_hides_debug_and_staff_only_fields():
    source = _read(FRONTEND_ROOT / "app" / "customer" / "tickets" / "[ticketId]" / "page.tsx")

    assert "debug" not in source
    assert "raw_provider_output" not in source
    assert "Advanced Debug" not in source
    assert "internal note" not in source.lower()


def test_ticket_post_audit_frontend_contracts():
    app_header = _read(FRONTEND_ROOT / "components" / "layout" / "app-header.tsx")
    landing = _read(FRONTEND_ROOT / "components" / "landing" / "landing-page.tsx")
    upload = _read(FRONTEND_ROOT / "app" / "upload" / "page.tsx")
    history = _read(FRONTEND_ROOT / "app" / "history" / "page.tsx")
    staff_history = _read(FRONTEND_ROOT / "app" / "staff" / "history" / "page.tsx")
    customer_dashboard = _read(FRONTEND_ROOT / "app" / "customer" / "dashboard" / "page.tsx")
    new_ticket = _read(FRONTEND_ROOT / "app" / "customer" / "new-ticket" / "page.tsx")
    login = _read(FRONTEND_ROOT / "app" / "login" / "page.tsx")
    customer_detail = _read(FRONTEND_ROOT / "app" / "customer" / "tickets" / "[ticketId]" / "page.tsx")
    staff_dashboard = _read(FRONTEND_ROOT / "app" / "staff" / "dashboard" / "page.tsx")
    staff_detail = _read(FRONTEND_ROOT / "app" / "staff" / "tickets" / "[ticketId]" / "page.tsx")
    ticket_ui = _read(FRONTEND_ROOT / "lib" / "ticket-ui.ts")
    role_helper = _read(FRONTEND_ROOT / "lib" / "demo-role.ts")
    whatsapp_helper = _read(FRONTEND_ROOT / "lib" / "whatsapp-thread.ts")

    assert "New Report" not in app_header
    assert 'href: "/upload"' not in app_header
    assert "Switch Role" in app_header
    assert "Incident Audit" in app_header
    assert 'href="/upload"' not in landing
    assert "Check a Photo" not in landing
    assert 'router.replace(role === "customer" ? "/customer/new-ticket" : "/login")' in upload
    assert 'router.replace("/staff/history")' in history
    assert 'useDemoRoleGuard("staff")' in staff_history
    assert "Incident Audit History" in staff_history
    assert "New Incident" not in staff_history
    assert "chargerdoc_customer_profile" in role_helper
    assert 'role === "customer" ? "/customer/new-ticket" : "/staff/dashboard"' in login
    assert 'useDemoRoleGuard("customer")' in customer_dashboard
    assert 'useDemoRoleGuard("customer")' in new_ticket
    assert 'useDemoRoleGuard("customer")' in customer_detail
    assert 'useDemoRoleGuard("staff")' in staff_dashboard
    assert 'useDemoRoleGuard("staff")' in staff_detail
    assert "fetchTickets({ customer_email: profile.email })" in customer_dashboard
    assert "Start your first support ticket" in customer_dashboard
    assert "saveDemoCustomerProfile(customer)" in new_ticket
    assert "addTicketEvidence" in customer_detail
    assert 'ticket.status === "waiting_customer"' in customer_detail
    assert "Proof uploaded. Your ticket has returned to after-sales review." in customer_detail
    assert "ticket.triage_result?.perception?.extraction?.bounding_boxes ?? []" in customer_detail
    assert "buildWhatsAppThread" in whatsapp_helper
    assert "hiddenCustomerEventTypes" in whatsapp_helper
    assert "staff_note_added" in whatsapp_helper
    assert "whatsapp_preview_marked_sent" in whatsapp_helper
    assert "internal_status_note" in whatsapp_helper
    assert "internal_assignment_note" in whatsapp_helper
    assert "After-sales Review" in ticket_ui
    assert "Technician Assigned" not in ticket_ui
    assert "showScheduling" in staff_detail
    assert "Open Scheduling" in staff_detail
    assert "isTerminalStatus" in staff_detail
    assert "Previous scheduled visit" in staff_detail
    assert "proof_uploaded" in staff_detail
    assert "Customer-uploaded proof for staff review" in staff_detail
    assert "const visibleTickets" in staff_dashboard


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
