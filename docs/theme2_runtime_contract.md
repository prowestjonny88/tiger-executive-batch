# Theme 2 Runtime Contract

The live backend response for `POST /api/v1/triage` is Theme 2-first.

```json
{
  "incident_id": 1,
  "incident": {},
  "perception": {
    "mode": "vlm",
    "evidence_type": "hardware_photo",
    "scene_summary": "Charger indicator is red.",
    "extraction": {
      "input_component": "charger",
      "observation_result": "charger_red_light",
      "charger_serial_number": null,
      "charger_brand_model": null
    }
  },
  "competition_output": {
    "input_component": "charger",
    "observation_result": "charger_red_light",
    "fault_type_v2": "charger_issue",
    "recipient_type": "after_sales_team",
    "assigned_team_id": "AS_TEAM_01",
    "action_message": "Screenshot the app if available and send to after-sales team.",
    "required_proof_next": "App screenshot or charger app error page if available.",
    "confidence_score": 0.9,
    "evidence_notes": [],
    "source": "theme2_rule_mapper"
  },
  "follow_up_prompts": [],
  "debug": {
    "rule_version": "2026-05-theme2-round2-v1",
    "rule_key": "charger_red_light"
  }
}
```

Deprecated live fields:

- `kb_retrieval`
- `diagnosis`
- `routing`
- `artifact`
- `issue_family`
- `resolver_tier`

The official routing output is `recipient_type` plus optional `assigned_team_id`.
