# Final Report Metrics Template

## 1. Dataset Overview

- Dataset: ESUM Theme 2 / Round 2 local working copy.
- Input categories: charger, EVDB, isolator.
- Raw images/videos remain outside Git under `data/round2/images/`.
- Clean eval baseline contains only unambiguous cases; quarantined cases are retained for review.

## 2. Rule Mapping Table

Summarize Theme 2 mappings:

- Charger red light -> charger issue -> after-sales team.
- Charger no light -> supply issue -> customer.
- Blinking red flash counts -> installation/manual/charger issue outcomes.
- EVDB missing/wrong protection -> protection issue -> after-sales team.
- MCB tripped -> protection issue -> customer unless repeated/safety terms escalate.
- Isolator OFF -> power cut -> customer.

## 3. Evaluation Method

- Weak-label sanity: validates rule and folder-label wiring. Do not report as visual accuracy.
- Blind image eval: neutral prompt, no expected labels leaked into `photo_hint`; use this as image-evaluation-like evidence.
- OCR exact metrics are reported only when non-null serial/brand ground truth exists.

## 4. Current Metrics

Fill after the final run:

```text
Weak-label sanity: __ / __
Blind image eval: __ / __
Input component accuracy: __
Observation accuracy: __
Fault type accuracy: __
Recipient accuracy: __
Serial exact match: n/a unless reviewed ground truth exists
Brand/model exact match: n/a unless reviewed ground truth exists
```

## 5. Manual-Review Quarantine

Explain that unstable EVDB spec-boundary cases, ambiguous multi-component isolator images, low-confidence outputs, and videos without extracted frames are quarantined in `manual_review_cases.json`.

## 6. Known Limitations

- Exact serial/brand OCR needs human-reviewed expected values.
- EVDB Type A vs Type AC markings can be visually unstable without close-up labels.
- Video support requires extracted frames before normal image evaluation.
- Raw dataset images are not committed.

## 7. Safety And Conservative Behavior

The runtime avoids guessing unreadable serials, brand/model, RCCB type, breaker ratings, and switch state. Unreadable evidence produces follow-up proof prompts rather than overclaiming.

## 8. Demo Screenshots Checklist

- Upload page with Theme 2 tips.
- Result page showing Organizer Required Output.
- Customer guidance page.
- After-sales routing page with `AS_TEAM_01`.
- History page with Theme 2 columns.
- Advanced debug collapsed by default.
