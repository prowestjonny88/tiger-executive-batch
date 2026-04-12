# Round 1 Classifier Findings — v3

_Last updated: 2026-04-11_

## 1. Purpose

This document captures the current Round 1 classifier and diagnosis-branch findings for OmniTriage after:
- 4-class visual baseline experiments
- 5-class visual baseline extension with `tapping_tnb_meter`
- temporary confidence / unknown behavior testing
- OCR branch prototyping for `WC Apps Error Logs`
- symptom-multimodal branch prototyping for `Charger No Pulse`
- top-level diagnosis branch orchestration testing

It is intended to update the prior `docs/round1_classifier_findings.md` with the latest working conclusions.

## 2. Product framing that remains locked

OmniTriage remains a **workflow-first troubleshooting system**, not a classifier demo.

The product shape is still:

> smart intake -> progressive hybrid diagnosis -> confidence-aware safety gate -> deterministic routing -> guided resolver output

This means:
- model outputs are inputs to workflow, not the workflow itself
- routing remains deterministic
- the supervised classifier is additive, not a hard dependency
- OCR and symptom-heavy cases should use dedicated branches rather than being forced into the visual classifier

## 3. Visual classifier scope

### 3.1 Final current visual classifier scope

The current known-fault visual classifier should include these 5 classes:
- `burnt_mark`
- `cable_termination_issue`
- `mcb_tripped`
- `tnb_fuse_blow`
- `tapping_tnb_meter`

### 3.2 Explicitly outside the visual classifier

These should not be treated as normal hardware-photo visual classes:
- `WC Apps Error Logs`
- `Charger No Pulse`

### 3.3 Why

- `WC Apps Error Logs` are screenshot / app-log evidence and belong to the OCR/text branch.
- `Charger No Pulse` is symptom-heavy and should depend mainly on follow-up answers plus multimodal reasoning.
- `tapping_tnb_meter` was initially held back as a borderline class, then tested as a 5th class and found to be usable enough to keep.

## 4. Visual model experiments

## 4.1 Experiment A — DINOv2 + Logistic Regression (4 classes)

This was the original strong baseline on:
- `burnt_mark`
- `cable_termination_issue`
- `mcb_tripped`
- `tnb_fuse_blow`

### Headline result
- Mean accuracy: `0.6825`
- Mean macro F1: `0.6778`

### Main findings
- `mcb_tripped` was very strong.
- `tnb_fuse_blow` was very strong.
- The main confusion pair was:
  - `burnt_mark`
  - `cable_termination_issue`

### Conclusion
This became the initial winning baseline.

## 4.2 Experiment B — DINOv2 + Linear SVM (4 classes)

This tested whether changing the linear head would improve the same 4-class DINOv2 setup.

### Headline result
- Mean accuracy: `0.6349`
- Mean macro F1: `0.6278`

### Conclusion
Linear SVM underperformed the logistic regression baseline.

## 4.3 Experiment C — CLIP + Logistic Regression (4 classes)

This tested whether changing the embedding backbone improved the same 4-class setup.

### Headline result
- Mean accuracy: `0.5873`
- Mean macro F1: `0.3667`

### Conclusion
CLIP performed substantially worse than DINOv2 on this Round 1 tiny-data baseline.

## 4.4 Visual baseline winner

The best current visual baseline is:

- **Backbone:** `DINOv2`
- **Head:** `multinomial logistic regression`

## 4.5 Experiment D / D2 — crop-based inference checks

### Tested ideas
- full image
- center crop
- quadrant crops
- tight manual object-focused crops

### Main result
- full image remained the strongest and safest default view
- center crop was sometimes acceptable as a consistency check
- tight local object crops reduced reliability and often removed useful component context

### Conclusion
Use:
- **full image as primary inference view**
- optionally center crop as a consistency check
- do **not** use tight object crops as the main inference strategy right now

## 4.6 Experiment E — add `tapping_tnb_meter` as the 5th class

A 5-class DINOv2 + logistic regression run was tested on:
- `burnt_mark`
- `cable_termination_issue`
- `mcb_tripped`
- `tnb_fuse_blow`
- `tapping_tnb_meter`

### Headline result
- Mean accuracy: approximately `0.6786`
- Mean macro F1: `0.6667`

### Key class results
- `mcb_tripped` remained excellent
- `tnb_fuse_blow` remained strong
- `tapping_tnb_meter` achieved usable performance
- `burnt_mark` vs `cable_termination_issue` remained the main weak boundary

### Decision
Keep `tapping_tnb_meter` inside the visual classifier for now.

The drop from the original 4-class baseline was small enough to accept.

## 5. Current visual classifier decision

### 5.1 Exported model status

The final current exported visual classifier bundle is:
- 5-class DINOv2 + logistic regression model
- label encoder
- temporary classifier-use policy

### 5.2 Temporary classifier-use policy

#### Confidence bands
- **high:** `max_prob >= 0.95`
- **medium:** `0.80 <= max_prob < 0.95`
- **low:** `< 0.80`

#### Product-level use rule
- if evidence is non-hardware or screenshot-like -> **bypass classifier**
- if hardware photo + high confidence -> **strong fault hint**
- if hardware photo + medium confidence -> **weak fault hint, needs confirmation**
- if hardware photo + low confidence -> **do not trust classifier alone**

### 5.3 Important caution

Confidence alone does not perfectly separate in-scope from ambiguous electrical lookalikes.

Therefore the classifier must remain:
- a **supporting signal**
- not the final diagnosis source
- not the routing source of truth

## 6. OCR branch findings — `WC Apps Error Logs`

## 6.1 OCR extraction outcome

A small OCR pass on screenshot/app-log evidence was able to extract useful signals such as:
- charger ID
- `faulted`
- `over-voltage fault`
- safety language like disconnecting power and checking supply/components

OCR was noisy but clearly good enough for MVP use.

## 6.2 OCR branch role

The OCR branch should:
- bypass the visual classifier
- extract visible text and status/fault cues
- produce structured hints such as:
  - `ocr_detected_status`
  - `ocr_detected_fault`
  - `issue_family_hint`
  - `resolver_hint`
  - `hazard_hint`
  - `next_question_hint`
  - `next_action_hint`

## 6.3 OCR branch decision

For screenshot/app-log evidence:
- `chosen_branch = ocr_text_branch`
- `bypass_visual_classifier = true`
- OCR/text interpretation becomes the primary signal

## 6.4 OCR branch output shape

The OCR branch was wrapped into a structured diagnosis-like object with fields such as:
- `diagnosis_source`
- `issue_type`
- `likely_fault`
- `evidence_summary`
- `confidence_band`
- `confidence_score`
- `unknown_flag`
- `severity`
- `resolver_hint_final`
- `next_question_hint`
- `next_action_hint`

## 6.5 Current OCR interpretation examples

### Screenshot 1 — app home page with `Faulted`
- issue type: `not_responding`
- likely fault: none explicitly named
- resolver hint: `remote_ops`
- confidence: medium
- next step: retrieve fault detail / backend status

### Screenshot 2 — `Over-voltage fault`
- issue type: `unknown_mixed`
- likely fault: `over_voltage_fault`
- resolver hint: `technician`
- hazard: high
- confidence: high
- next step: disconnect supply, inspect voltage path and internal protection

## 7. Symptom-multimodal branch findings — `Charger No Pulse`

## 7.1 Reason for separate branch

`Charger No Pulse` is symptom-heavy and should not be forced into the visual classifier.

The branch should depend mainly on:
- symptom text
- bounded follow-up answers
- optional error code / OCR text
- later: real multimodal reasoning / VLM support

## 7.2 Structured follow-up input

The current bounded follow-up question set includes:
- is the screen on?
- is there a visible error code?
- what is the LED / indicator state?
- is there visible physical damage?
- did charging never start or stop suddenly?

## 7.3 Temporary branch behavior

The current temporary reasoning layer can already distinguish between:
- medium-confidence no-display / not-charging cases
- error-code-present operational cases
- visible-damage high-severity cases
- unclear low-confidence cases that should ask for more detail

## 7.4 Branch contract

For `Charger No Pulse`-style cases:
- `chosen_branch = symptom_multimodal_branch`
- visual classifier is bypassed as the **primary** reasoning path
- OCR is optional if visible text exists
- follow-up answers are the primary structured signal

## 7.5 Current output shape

The symptom branch was normalized to the same diagnosis schema as the OCR branch.

That means it now produces:
- `diagnosis_source`
- `issue_type`
- `likely_fault`
- `evidence_summary`
- `confidence_band`
- `confidence_score`
- `unknown_flag`
- `severity`
- `resolver_hint_final`
- `next_question_hint`
- `next_action_hint`

## 8. Branch orchestration finding

A top-level temporary diagnosis router was prototyped and successfully selected among three branches:

- **`ocr_text_branch`** for screenshot/app-log/display-text evidence
- **`hardware_visual_branch`** for known physical visual hardware cases
- **`symptom_multimodal_branch`** for symptom-heavy cases such as `Charger No Pulse`

All three branches now terminate in one common diagnosis schema.

This is a major architecture milestone because it means OmniTriage no longer depends on one single diagnosis style.

## 9. Current architecture conclusion

The current agreed diagnosis architecture is:

### Branch 1 — Hardware Visual Branch
Used for known physical visual cases.

Current signal:
- exported 5-class DINOv2 + logistic regression classifier

### Branch 2 — OCR Text Branch
Used for screenshot/app-log/display-text evidence.

Current signal:
- OCR extraction + rule-based interpretation

### Branch 3 — Symptom Multimodal Branch
Used for symptom-heavy non-pure-visual cases such as `Charger No Pulse`.

Current signal:
- bounded follow-up answers + temporary structured reasoning
- later to be upgraded with real multimodal LLM/VLM support

### Shared downstream path
All branches should feed into:
- confidence-aware safety gate
- deterministic organizer workflow / routing
- guided resolution / escalation output

## 10. What remains to do

## 10.1 Documentation / tracking
The following repo docs should now be updated to reflect real progress:
- `docs/prd_task_breakdown.md`
- `docs/progress_tracker.md`
- `docs/round1_classifier_findings.md`

## 10.2 Backend integration
Next engineering milestone:
- turn the notebook branch logic into backend diagnosis modules
- create a top-level diagnosis orchestrator
- preserve one common diagnosis contract across branches

## 10.3 Replace temporary notebook logic with real providers
Still pending:
- real OCR/display-text extraction in backend
- real multimodal VLM/API provider
- model-backed fusion of follow-up answers into diagnosis
- calibrated thresholds from real labeled data

## 11. Current decisions to treat as locked unless new evidence appears

1. OmniTriage remains a **workflow-first** system, not a classifier-only app.
2. Routing remains **deterministic**.
3. The supervised classifier remains **additive**, not required for the app to function.
4. The current visual classifier stack is:
   - DINOv2 embeddings
   - logistic regression
   - 5 known physical visual classes
5. Screenshot/app-log evidence belongs to the **OCR branch**, not the visual classifier.
6. `Charger No Pulse` belongs to the **symptom-multimodal branch**, not the visual classifier.
7. Full image remains the default visual inference view.
8. Temporary confidence policy exists and should be used conservatively until backend calibration is implemented.

## 12. Recommended next implementation priority

The next highest-value step is:

> convert the validated notebook branch architecture into a repo integration plan and backend diagnosis orchestrator

That means:
- update the docs/progress trackers
- define diagnosis interfaces for each branch
- load the exported 5-class classifier in backend
- add backend OCR extraction module
- add symptom-branch provider interface
- keep deterministic routing unchanged downstream
