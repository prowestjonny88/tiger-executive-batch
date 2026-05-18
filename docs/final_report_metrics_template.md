# Final Report Metrics Template

## 1. System Overview

RExharge Theme 2 Triage is a VLM-assisted EV charger support prototype. It accepts charger, EVDB, isolator, and optional EV app screenshot evidence, extracts Theme 2 observations, applies deterministic organizer rules, and routes to customer guidance or after-sales team `AS_TEAM_01`.

## 2. Architecture

```text
Next.js frontend
-> FastAPI backend
-> Gemini perception and app-screenshot OCR
-> Theme 2 rule mapper
-> Postgres incident/audit history
-> GCS/local evidence storage
```

Raw Dataset 2 media is not deployed with the app. Uploaded user evidence is stored separately.

## 3. Organizer Rule Mapping

- Charger red light -> charger issue -> after-sales team.
- Charger no light -> supply issue -> customer breaker check first; escalates only after breaker-normal/still-off follow-up.
- Blinking red + 6 flashes / ground fault -> installation issue -> after-sales.
- Blinking red + 7 flashes / emergency stop -> manual error -> customer.
- Blinking red + 8 flashes / short circuit -> charger issue -> after-sales.
- Blinking red + 9 flashes / over-temperature -> charger issue -> customer restart/cooldown.
- EVDB missing MCB/RCCB -> protection issue -> after-sales.
- EVDB wrong specs or Type AC RCCB -> protection issue -> after-sales.
- MCB tripped -> protection issue -> customer unless repeated/safety terms escalate.
- Isolator OFF -> power cut -> customer.

## 4. Evidence Behavior

- Charger photos can produce indicator state, serial number, brand/model, and charger bounding box.
- EVDB photos can produce MCB/RCCB visibility, amps, poles, Type A/Type AC evidence, spec status, and EVDB bounding box.
- Isolator photos can produce ON/OFF state and isolator bounding box.
- EV app screenshots can add visible app status text, error codes, flash counts, and fault hints.
- Unreadable evidence creates proof prompts rather than guessed values.

## 5. Evaluation Method

- Weak-label sanity: validates folder-label/rule wiring only. Do not report as visual accuracy.
- Blind image eval: neutral prompt without expected-label leakage. Use as image-evaluation-like evidence when Gemini is enabled.
- Unseen external smoke: prediction-only unless expected labels are independently reviewed.
- OCR exact metrics require human-reviewed serial/brand ground truth.

## 6. Current Metrics

Fill after final local run:

```text
Weak-label sanity: __ / __
Blind image eval: __ / __
Input component accuracy: __
Observation accuracy: __
Fault type accuracy: __
Recipient accuracy: __
Follow-up requested: __
Serial exact match: n/a unless reviewed ground truth exists
Brand/model exact match: n/a unless reviewed ground truth exists
```

## 7. Quarantine Explanation

Low-confidence images, ambiguous multi-component images, unstable EVDB boundary cases, videos without extracted frames, and cases with conflicting weak/VLM labels remain in `manual_review_cases.json`. They are not discarded; they are held until human review confirms final labels.

## 8. Known Limits

- Exact charger OCR validation needs manually reviewed expected values.
- EVDB Type A vs Type AC can require close-up labels.
- Videos require extracted frames before normal image evaluation.
- App screenshots improve evidence but may be unavailable to some users.
- The clean eval baseline should not be described as full Dataset 2 coverage.

## 9. Safety And Conservative Behavior

The runtime avoids guessing unreadable serials, brand/model, RCCB type, breaker ratings, pole counts, hidden app status, and isolator switch state. It asks for clearer proof when evidence is incomplete.

## 10. Screenshot Checklist

- Landing page.
- Upload page.
- Result page with organizer output, confidence, proof prompts, and bounding box overlay.
- Red-light result with optional EV app screenshot upload.
- Customer guidance page.
- After-sales routing page.
- History page.
