# Theme 2 Runtime Contract

The live backend contract is Theme 2 first. Existing route names are stable, but the response shape is the newer organizer-oriented output.

## Core Route

```text
POST /api/v1/triage
```

Input accepts a primary hardware image and, optionally, an EV app screenshot:

```json
{
  "incident_id": 1,
  "site_id": "site-mall-01",
  "charger_id": "RX-2049-A",
  "photo_evidence": {},
  "app_screenshot_evidence": {},
  "photo_hint": "Photo uploaded for EV charger troubleshooting.",
  "symptom_text": "Charger has a red light.",
  "error_code": "",
  "follow_up_answers": {}
}
```

## Response Shape

```json
{
  "incident_id": 1,
  "incident": {},
  "perception": {
    "mode": "vlm",
    "evidence_type": "hardware_photo",
    "scene_summary": "Charger indicator is red. App screenshot reviewed.",
    "components_visible": ["charger"],
    "visible_abnormalities": ["red_indicator"],
    "ocr_findings": ["App fault hint: charger fault"],
    "hazard_signals": [],
    "uncertainty_notes": [],
    "confidence_score": 0.91,
    "requires_follow_up": false,
    "provider_attempted": true,
    "fallback_used": false,
    "extraction": {
      "input_component": "charger",
      "observation_result": "charger_red_light",
      "charger_serial_number": null,
      "charger_brand_model": null,
      "indicator_status": "red_light",
      "evdb_phase_type": "unknown",
      "mcb_visible": null,
      "rccb_visible": null,
      "mcb_rating": null,
      "rccb_rating": null,
      "rccb_type": "unknown",
      "isolator_state": "unknown",
      "raw_visible_text": ["App text: Charger fault"],
      "bounding_boxes": [
        {
          "id": "charger-unit",
          "label": "Charger unit",
          "x": 25.0,
          "y": 12.0,
          "width": 50.0,
          "height": 72.0,
          "source": "vlm"
        }
      ],
      "confidence_score": 0.91,
      "uncertainty_notes": []
    }
  },
  "competition_output": {
    "input_component": "charger",
    "observation_result": "charger_red_light",
    "charger_serial_number": null,
    "charger_brand_model": null,
    "fault_type_v2": "charger_issue",
    "recipient_type": "after_sales_team",
    "assigned_team_id": "AS_TEAM_01",
    "action_message": "Screenshot the app if available and send to after-sales team.",
    "required_proof_next": "App screenshot or charger app error page if available.",
    "confidence_score": 0.91,
    "evidence_notes": [],
    "source": "theme2_rule_mapper"
  },
  "follow_up_prompts": [
    {
      "question_id": "charger_app_screenshot",
      "prompt": "If available, upload a screenshot from the EV charging app showing the charger fault/status.",
      "reason": "The Theme 2 guide asks for EV app screenshot evidence for charger red-light cases when available."
    }
  ],
  "debug": {
    "rule_version": "2026-05-theme2-round2-v1",
    "rule_key": "charger_red_light",
    "error_log_key": null
  }
}
```

## Supported Evidence

- `photo_evidence`: primary charger, EVDB, or isolator image.
- `app_screenshot_evidence`: optional EV app screenshot used to extract visible app status text, error code, flash count, or fault hint.
- `bounding_boxes`: percentage-based object boxes for visible evidence. They are VLM-provided when available and conservative heuristic boxes otherwise.

## Organizer Outputs

- `input_component`: `charger`, `evdb`, `isolator`, `unknown`
- `observation_result`: Theme 2 observation result
- `charger_serial_number`, `charger_brand_model`: only for readable charger identity evidence
- `fault_type_v2`: organizer fault type
- `recipient_type`: `customer`, `after_sales_team`, `none`, `unknown`
- `assigned_team_id`: `AS_TEAM_01` for after-sales routes
- `action_message`: user-facing or after-sales-facing next step
- `required_proof_next`: proof request when evidence is incomplete

## Deprecated Live Fields

These are archived Round 1 concepts and must not appear in the live triage response:

- `kb_retrieval`
- `diagnosis`
- `routing`
- `artifact`
- `issue_family`
- `resolver_tier`
