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


def test_home_location_and_identity_confirmation_contracts():
    api_source = _read(FRONTEND_ROOT / "lib" / "api.ts")
    identity_helper = _read(FRONTEND_ROOT / "lib" / "charger-identity.ts")
    new_ticket = _read(FRONTEND_ROOT / "app" / "customer" / "new-ticket" / "page.tsx")
    customer_detail = _read(FRONTEND_ROOT / "app" / "customer" / "tickets" / "[ticketId]" / "page.tsx")
    staff_detail = _read(FRONTEND_ROOT / "app" / "staff" / "tickets" / "[ticketId]" / "page.tsx")

    assert "location_lat" in api_source
    assert "location_lng" in api_source
    assert "location_accuracy_m" in api_source
    assert "home_charger_location" in api_source
    assert "charger_location_notes" in api_source
    assert "formatHomeChargerLocation" in api_source
    assert "formatLocationSource" in api_source
    assert "extractChargerIdentitySuggestion" in identity_helper
    assert "competition_output" in identity_helper
    assert "perception" in identity_helper
    assert "The charger label was not readable" in identity_helper
    step2_source = new_ticket.split("{step === 2 &&", 1)[1].split("{step === 3 &&", 1)[0]
    step3_source = new_ticket.split("{step === 3 &&", 1)[1].split("{step === 4 &&", 1)[0]
    step4_source = new_ticket.split("{step === 4 &&", 1)[1]

    assert "Home Charger Location and Issue Context" in step2_source
    assert "Use Current Location" in new_ticket
    assert "navigator.geolocation.getCurrentPosition" in new_ticket
    assert "Home charger location" in step2_source
    assert "Installed by" in step2_source
    assert "Describe the issue" in step2_source
    assert "Error code shown on charger/app, if any" in step2_source
    assert "Customer type" not in step2_source
    assert "Installer name" not in step2_source
    assert "Charger location notes" not in step2_source
    assert "Charger serial number" not in step2_source
    assert "Charger brand/model" not in step2_source
    assert "Upload a photo of the charger issue" in step3_source
    assert "Upload a clear photo of the charger, EVDB, isolator, or visible fault indicator." in step3_source
    assert "Optional: Add charger label photo" in step3_source
    assert "This helps after-sales verify your charger model and serial number faster." in step3_source
    assert "Do not open the charger casing or electrical panels." in step3_source
    assert "try to read" not in step3_source
    assert "Contact" in new_ticket
    assert "Home Charger" in new_ticket
    assert "Problem Photo" in new_ticket
    assert "Diagnosis & Ticket" in new_ticket
    assert "Diagnosis Summary" in step4_source
    assert "What happens next" in step4_source
    assert "Optional Charger Details" in step4_source
    assert step4_source.index("Diagnosis Summary") < step4_source.index("Optional Charger Details")
    assert "Create Support Ticket" in step4_source
    assert "Confirm and Create Ticket" not in step4_source
    assert "runTriageOnly" in new_ticket
    assert "createTicketAfterIdentityReview" in new_ticket
    assert "Check Photo and Create Ticket" not in new_ticket
    assert "Home charger details" in customer_detail
    assert "formatHomeChargerLocation" in customer_detail
    assert "canRequestReschedule" in customer_detail
    assert "Previous Scheduled Visit" in customer_detail
    assert "Open in Google Maps" in staff_detail
    assert "formatLocationSource" in staff_detail
    assert "Charger label photo for brand/model and serial verification" in staff_detail
    assert "Not provided - request charger label close-up if needed." in staff_detail
    assert "incident.charger_id" not in identity_helper


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
    ticket_actions = _read(FRONTEND_ROOT / "lib" / "ticket-actions.ts")
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
    assert "Needs Review" in staff_dashboard
    assert "Waiting Customer" in staff_dashboard
    assert "High Priority" in staff_dashboard
    assert "To Schedule" in staff_dashboard
    assert "Scheduled Today" in staff_dashboard
    assert "Reopened" in staff_dashboard
    assert "Action Needed" in staff_dashboard
    assert "Proof Status" in staff_dashboard
    assert "Schedule Status" in staff_dashboard
    assert "Last Updated" in staff_dashboard
    assert "Recommended Staff Action" in staff_detail
    assert "getTicketActionNeeded" in ticket_actions
    assert "getProofStatus" in ticket_actions
    assert "getScheduleStatus" in ticket_actions
    assert "getTicketActionNeeded(ticket)" in staff_dashboard
    assert "getTicketActionNeeded(ticket)" in staff_detail


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
