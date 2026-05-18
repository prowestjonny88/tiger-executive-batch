# Final Demo Runbook

## Demo Objective

Show that the MVP can inspect Theme 2 charger, EVDB, and isolator evidence; output the organizer-required observation result; identify charger serial/brand when the image is a charger label; classify the fault type; and route the case to the customer or after-sales team.

## Demo Cases

Use the upload page demos or local Dataset 2 images for:

- Charger red light -> charger issue -> after-sales team `AS_TEAM_01`.
- Charger no light -> supply issue -> customer checks EVDB breaker first. If follow-up confirms the breaker is normal and the charger is still off, the runtime escalates as charger issue to after-sales.
- Charger serial/brand image -> identity extraction, or close-up proof prompt if unreadable.
- EVDB three phase -> phase observation plus MCB/RCCB label proof requirement if specs are unclear.
- MCB tripped -> protection issue, with customer reset guidance unless repeated-trip/safety terms escalate to after-sales.
- Isolator OFF -> power cut -> customer turns ON isolator and checks EVDB breaker.
- Blinking red with 6/7/8/9 flashes -> mapped error-log behavior.

## Accuracy Language

Use two evaluation terms precisely:

- Weak-label sanity checks folder/rule consistency and fallback wiring. It is not visual accuracy.
- Blind image eval uses a neutral prompt and is the closest local proxy for image-evaluation behavior.

Current clean baseline: `21/21` blind image eval and `21/21` weak-label sanity. This validates the clean reviewed pack, not full Dataset 2 coverage. Ambiguous or unstable examples are quarantined in `data/round2/manual_review_cases.json` instead of being forced into the clean score.

## Manual Review Language

We do not manually label the entire dataset. The workflow uses folder weak labels, VLM pseudo-labeling, deterministic Theme 2 rules, and targeted quarantine for unclear cases. Quarantined cases can later be promoted only after human-confirmed `manual_*` fields are filled.

## Serial And Brand Language

Serial/brand extraction applies only to charger label images. EVDB result evidence should show MCB/RCCB fields, and isolator result evidence should show switch-state fields instead of charger serial and brand/model fields.

Exact OCR accuracy should be reported only after human-reviewed `serial_number_expected` and `brand_model_expected` values are added to evaluation cases.

## Operator Checklist

- Start backend and frontend.
- Confirm `GEMINI_API_KEY` is set for VLM-backed image demos.
- Run `py scripts\check_round2_eval_coverage.py`.
- Run `py scripts\evaluate_round2_cases.py --mode blind-image-eval --show-failures`.
- Keep generated eval reports local unless explicitly requested.
