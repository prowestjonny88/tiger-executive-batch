# OmniTriage Round 1 Classifier Findings (Updated)

_Last updated: 2026-04-11_

## 1. Purpose

This document records the current state of the Round 1 visual classifier work for OmniTriage.

It updates the earlier findings with:
- the final 5-class visual baseline decision
- the temporary confidence / classifier-use policy
- the crop-inference findings
- the decision on what remains outside the visual classifier
- the recommended next implementation direction

---

## 2. Product context

OmniTriage is not a classifier-only product.

It is a confidence-aware EV charger incident triage system that should:
- accept charger evidence
- diagnose likely issue/fault
- express confidence and uncertainty
- route the case safely
- generate the correct next action

The visual classifier is therefore only a **lightweight additive known-fault layer**, not the whole diagnosis engine. The broader system remains workflow-first, not classifier-first. This aligns with the project handoff and architecture direction. fileciteturn0file2

The Theme 2 competition brief also expects more than a raw classifier: teams must detect/classify charger faults, identify anomalies, differentiate between simple/user-resolvable and technician-required issues, and produce a working MVP. fileciteturn0file1

---

## 3. Round 1 organizer classes

Organizer classes reviewed:
- Burnt Mark Issue
- Cable termination- connection
- Charger No Pulse
- MCB Tripped
- TNB Fuse Blow Issue
- Tapping TNB Meter
- WC Apps Error Logs

Approximate counts observed in the working dataset:
- burnt_mark: 4
- cable_termination_issue: 6
- mcb_tripped: 3
- tnb_fuse_blow: 6
- tapping_tnb_meter: 3
- charger_no_pulse: excluded from classifier
- wc_apps_error_logs: excluded from classifier

---

## 4. Visual classifier scope decisions

### 4.1 Initial 4-class visual baseline

The first clean visual baseline intentionally included only the strongest physical visual classes:
- `burnt_mark`
- `cable_termination_issue`
- `mcb_tripped`
- `tnb_fuse_blow`

These were chosen because they were the clearest candidates for a tiny-data known-fault baseline.

### 4.2 Initially excluded from the visual classifier

These were deliberately left out of the first visual classifier:
- `WC Apps Error Logs` -> OCR / text path
- `Charger No Pulse` -> follow-up questions + broader diagnosis / VLM path
- `Tapping TNB Meter` -> initially deferred as a borderline visual class

This kept the first experiment clean and aligned with the broader product design.

### 4.3 Updated current visual classifier scope

After the Step 3 experiment, the current visual classifier scope is now:
- `burnt_mark`
- `cable_termination_issue`
- `mcb_tripped`
- `tnb_fuse_blow`
- `tapping_tnb_meter`

Still excluded from the visual classifier:
- `WC Apps Error Logs`
- `Charger No Pulse`

---

## 5. Model family experiments

## Experiment A — DINOv2 + logistic regression (4-class)

Result:
- mean accuracy: **0.6825**
- mean macro F1: **0.6778** fileciteturn5file0

Observed behavior:
- `mcb_tripped` strong
- `tnb_fuse_blow` strong
- main confusion remained between:
  - `burnt_mark`
  - `cable_termination_issue`

Decision:
- this became the initial winning baseline.

## Experiment B — DINOv2 + linear SVM (4-class)

Result:
- mean accuracy: **0.6349**
- mean macro F1: **0.6278** fileciteturn7file0

Decision:
- worse than logistic regression
- logistic regression remains preferred.

## Experiment C — CLIP + logistic regression (4-class)

Result:
- mean accuracy: **0.5873**
- mean macro F1: **0.3667** fileciteturn8file0

Decision:
- substantially worse than DINOv2
- DINOv2 remains the preferred embedding family.

### Model-family conclusion

The best visual baseline family is:
- **DINOv2 embeddings + multinomial logistic regression**

---

## 6. Crop / zoom experiments

### Initial hypothesis

Because faults often occupy only a small region of the uploaded image, we tested whether crop-based inference would improve classification.

### What was tested

Comparisons included:
- full image
- center crop
- quadrant crops
- tighter manually selected object-focused crops

### Findings

- full image often remained the best view
- center crop was usually safe as a secondary check
- tight manual object-focused crops often removed useful component context
- object-focused crop was worse than full image on the reviewed 6-image set

### Conclusion

For the current Round 1 baseline:
- **primary inference view = full image**
- **optional consistency check = center crop**
- **do not use tight object-focused crop as the primary inference strategy**

This means the current bottleneck is more likely label overlap / visual overlap than simple lack of zoom.

---

## 7. Confidence and classifier-use policy

A temporary confidence test set was created with 3 buckets:
- `in_scope`
- `ambiguous`
- `out_of_scope`

Observed summary:
- `in_scope` confidence was consistently very high
- `out_of_scope` examples could still get non-trivial confidence if only max probability was used
- `ambiguous` examples were mixed

This confirmed that raw classifier scores alone are not enough; the classifier must be governed by a confidence-aware usage policy. This is also consistent with the PRD and task breakdown, which already expect confidence banding and note that real threshold tuning remains pending after Round 1. fileciteturn18file1 fileciteturn18file0

### Temporary confidence band policy

Current temporary rule:
- **high**: `max_prob >= 0.95`
- **medium**: `0.80 <= max_prob < 0.95`
- **low**: `max_prob < 0.80`

### Temporary classifier-use policy

Use the classifier as follows:

- if non-hardware / screenshot-like evidence -> **bypass_classifier**
- if hardware photo + high confidence -> **strong_fault_hint**
- if hardware photo + medium confidence -> **weak_fault_hint_needs_confirmation**
- if hardware photo + low confidence -> **do_not_trust_classifier_alone**

### Important caution

A hard electrical lookalike / ambiguous case can still appear highly classifier-confident. Therefore, even a `strong_fault_hint` should be treated as:
- a strong fault-type signal
- **not** the full diagnosis
- **not** the final routing decision

The classifier should feed into the broader OmniTriage diagnosis -> confidence -> routing workflow, not replace it.

---

## 8. Step 3 result: adding `tapping_tnb_meter`

A 5-class experiment was run using:
- DINOv2 embeddings
- multinomial logistic regression
- 3-fold cross-validation

Class set:
- `burnt_mark`
- `cable_termination_issue`
- `mcb_tripped`
- `tapping_tnb_meter`
- `tnb_fuse_blow`

5-class result:
- mean accuracy: **~0.6786**
- mean macro F1: **0.6667**

Classification report highlights:
- `burnt_mark` F1 = **0.44**
- `cable_termination_issue` F1 = **0.40**
- `mcb_tripped` F1 = **1.00**
- `tapping_tnb_meter` F1 = **0.80**
- `tnb_fuse_blow` F1 = **0.86** fileciteturn24file0

### Comparison vs old 4-class winner

4-class baseline:
- mean accuracy: **0.6825**
- mean macro F1: **0.6778** fileciteturn5file0

5-class baseline:
- mean accuracy: **~0.6786**
- mean macro F1: **0.6667**

### Decision

Adding `tapping_tnb_meter` caused only a small overall drop while the class itself achieved a usable F1.

Therefore:
- **keep `tapping_tnb_meter` in the visual classifier for now**
- but subject it to the same confidence-aware usage rules as other known visual classes

---

## 9. Current visual classifier bundle to freeze

The current visual classifier bundle should be frozen/exported as:
- trained 5-class logistic regression model
- label encoder
- temporary classifier confidence/use policy
- metrics and confusion matrix artifacts

### Current known visual classes
- `burnt_mark`
- `cable_termination_issue`
- `mcb_tripped`
- `tnb_fuse_blow`
- `tapping_tnb_meter`

### Still not in the visual classifier
- `WC Apps Error Logs`
- `Charger No Pulse`

---

## 10. Remaining weaknesses

The main visual-model weakness remains:
- confusion between `burnt_mark` and `cable_termination_issue`

This suggests a likely combination of:
- visual overlap
- label-boundary ambiguity
- limited tiny-data support

This is now more likely a data / label-boundary issue than a backbone or crop-strategy issue.

---

## 11. What should happen next

### Next branch: Step 4 — OCR path for `WC Apps Error Logs`

This should be implemented as a separate path that:
- reads screenshot-like evidence
- extracts visible text / app status / error indicators
- maps text into issue hints and likely resolver direction

This is important because `WC Apps Error Logs` should not be forced into the hardware-photo classifier path, and the task breakdown still lists real OCR/display-text extraction as pending. fileciteturn18file0

### After that: Step 5 — `Charger No Pulse`

This should be handled via:
- follow-up questions
- visible evidence
- optional OCR/error-code input
- broader diagnosis / VLM reasoning

It should not be forced into the visual classifier.

---

## 12. Final current state

### Locked visual baseline
- **Backbone:** DINOv2
- **Classifier head:** multinomial logistic regression
- **Inference view:** full image primary, center crop optional check
- **Visual classes included:** 5
- **Confidence policy:** temporary high / medium / low gate defined
- **Classifier role:** additive known-fault signal only

### Not yet done
- OCR path for screenshot-like evidence
- `Charger No Pulse` follow-up / VLM path
- backend integration of classifier as optional signal
- richer KB and annotated evidence output
- later production-grade threshold calibration

---

## 13. One-paragraph summary

The Round 1 visual-classifier work has now converged on a stable baseline: frozen DINOv2 embeddings with multinomial logistic regression. Logistic regression outperformed linear SVM, and CLIP embeddings underperformed substantially. Full-image inference remained better than aggressive object-focused cropping, with center crop retained only as an optional consistency check. A temporary confidence-aware usage policy was defined so the classifier behaves as a strong fault hint only for high-confidence hardware-photo evidence and is otherwise weakened, bypassed, or treated conservatively. Adding `tapping_tnb_meter` as a fifth visual class caused only a small drop in aggregate performance while achieving a usable class-level F1, so it should remain in the visual classifier for now. The next implementation priority is therefore not more visual-model experimentation, but building the separate OCR/text path for `WC Apps Error Logs`, followed by the symptom-first path for `Charger No Pulse`.
