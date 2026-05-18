# Final Demo Runbook

## Demo Objective

Show the end-to-end Theme 2 workflow:

```text
upload evidence -> VLM perception -> rule mapping -> proof prompt -> customer guidance or after-sales routing
```

The demo should emphasize organizer-required outputs, conservative proof requests, optional EV app screenshot refinement, and the difference between customer-facing and after-sales outputs.

## Pre-Demo Checklist

1. Backend health returns `runtime_mode: theme2_round2_clean`.
2. `GEMINI_API_KEY` is set for real image demos.
3. Frontend env points to the active backend URL.
4. Upload storage is GCS in deployment or local disk for local testing.
5. Run:

```powershell
py scripts\check_round2_eval_coverage.py
py scripts\evaluate_round2_cases.py --mode weak-label-sanity --show-failures
```

Run Gemini-backed blind eval only when raw local images and an API key are available:

```powershell
py scripts\evaluate_round2_cases.py --mode blind-image-eval --show-failures
```

## Demo Cases

- Charger red light -> charger issue -> after-sales team `AS_TEAM_01`; optionally add EV app screenshot.
- Charger blinking red -> ask for flash count or app error log; 6/7/8/9 map to the organizer error-log rules.
- Charger no light -> customer checks EVDB breaker first; escalates only if breaker is normal and charger remains off.
- Charger serial/brand label -> identity extraction or close-up proof request when unreadable.
- EVDB phase/spec evidence -> MCB/RCCB fields, Type A/Type AC handling, and label close-up proof when incomplete.
- MCB tripped -> protection issue; repeated trip or safety terms escalate.
- Isolator OFF -> power cut -> customer turns ON isolator and checks EVDB breaker.

## Result Page Talking Points

- `Organizer Required Output` is the first result section.
- Charger evidence shows serial/brand fields.
- EVDB evidence shows MCB/RCCB/spec fields.
- Isolator evidence shows switch state.
- Bounding boxes highlight the evidence object when available.
- Advanced debug is collapsed by default.
- Fallback mode is visibly disclosed.

## Accuracy Language

Use these terms precisely:

- Weak-label sanity validates pipeline and rule wiring. It is not visual accuracy.
- Blind image eval uses neutral hints and is the closest local proxy for image-evaluation behavior.
- Quarantined/manual-review cases are retained instead of forced into the clean score.
- Exact serial/brand OCR accuracy is partial until human-reviewed expected values are added.

## Screenshot Checklist

- Landing page.
- Upload page with Theme 2 tips.
- Result page with organizer output and evidence overlay.
- Optional EV app screenshot upload on red-light result.
- Customer guidance page.
- After-sales routing page with `AS_TEAM_01`.
- History page with Theme 2 columns.
