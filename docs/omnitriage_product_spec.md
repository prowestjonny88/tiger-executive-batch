# OmniTriage Product Specification

## Implementation Status Note
This document contains earlier design-phase language about resolver tiers and tier-specific artifacts.

The current implementation has moved to the organizer decision tree as the live backbone:
- issue type: `no_power`, `tripping_mcb_rccb`, `charging_slow`, `not_responding`
- shared checks: main power supply, cable condition, indicator/error code
- workflow outcome: `resolved` or `escalate`

When this file conflicts with current code, prefer:
- `README.md`
- `docs/OmniTriage_Technical_Architecture.md`
- `docs/progress_tracker.md`

**Working Title:** OmniTriage  
**Theme:** ESUM x RExharge Case Study Competition — Theme 2: EV Charger Troubleshooting  
**Document Type:** Consolidated product spec based on the full working discussion  
**Status:** Draft v1.0

---

## 1. Executive Summary

OmniTriage is a **confidence-aware EV charger troubleshooting platform** designed to reduce charger downtime by routing each incident to the **safest appropriate resolver** as quickly as possible.

The product is intentionally designed as a **workflow system**, not just a classifier.

It does five core things:

1. Collects usable incident evidence through a **smart intake flow**.
2. Diagnoses likely issues through a **progressive hybrid diagnosis engine**.
3. Applies a **confidence-aware safety gate** before acting on uncertain outputs.
4. Routes the case through **deterministic resolver routing**.
5. Produces a **resolver-specific action artifact**: user guide, local SOP card, remote ops pack, or technician dispatch packet.

The strategic idea behind the product is simple:

> **Photo + symptoms -> diagnosis -> confidence-aware triage -> safe next action**

This product spec reflects the final direction agreed during the design discussion:

- web-first,
- multimodal,
- conservative under uncertainty,
- adaptive to self-service and staffed sites,
- able to work before the organizer’s first dataset arrives,
- and designed to improve once Round 1 and later datasets are received.

---

## 2. Product Goal

### Primary Goal
Help RExharge reduce unnecessary technician dispatches and accelerate charger recovery by turning incident reports into **safe, explainable next-action decisions**.

### Product Promise
In under a minute, OmniTriage should gather enough evidence to make a **safe first triage decision** and hand the issue to the right resolver with the right action artifact.

### What the product is *not*
OmniTriage is not:

- a generic image classifier demo,
- a free-form chatbot that improvises repair advice,
- a fully autonomous repair system,
- or a hard dependency on manufacturer manuals from day one.

---

## 3. Problem Statement

EV charger downtime often comes from a mix of:

- technical faults,
- connectivity issues,
- and simple operational mistakes.

Today, troubleshooting is often manual, slow, and expensive. Some cases genuinely require technician intervention, but many do not. The product opportunity is to:

- detect likely issues quickly,
- distinguish safe/simple cases from risky ones,
- and route the issue to the **best safe available resolver**.

The key business value is not just better classification. It is:

- fewer wasted truck rolls,
- faster resolution,
- safer escalation,
- and higher charger uptime.

---

## 4. Design Principles Locked from the Discussion

### 4.1 Workflow over raw model output
The system must not stop at “what is wrong.” It must answer:

- what is likely happening,
- how confident we are,
- who should act next,
- and what they should do.

### 4.2 Conservative by design
When uncertain, the product should not bluff. It should:

- ask for a bit more evidence,
- show uncertainty honestly,
- and escalate upward when risk is non-trivial.

### 4.3 Web-first, fast-entry experience
The product should work as a **QR-triggered mobile web flow / PWA**, not a heavy native app.

### 4.4 Multimodal, but scoped
Vision alone is not enough. The system should combine:

- photo evidence,
- screen / error code extraction,
- and short symptom confirmation questions.

### 4.5 Deterministic routing
Routing should be based on **hardcoded business and safety rules**, not open-ended generative decisions.

### 4.6 Works before the dataset arrives
The product must be useful **before Round 1** and improve **after Round 1**.

### 4.7 Site-aware resolver logic
Not every site has on-site staff. Routing must depend on **site capability**, not role assumptions alone.

---

## 5. Target Users and Resolvers

OmniTriage serves multiple actors, but each gets a different output type.

### 5.1 EV Driver
A non-technical end user who may safely perform very limited actions.

### 5.2 Local Site Resolver
An authorized local person with physical site access and basic SOP permission. This is **not guaranteed to exist** at every station.

Examples:
- security staff,
- facility staff,
- mall management,
- condo management,
- maintenance personnel.

### 5.3 Remote Ops
A remote support / operations team capable of backend checks or guided support.

### 5.4 Technician
A trained physical responder for hardware, electrical, or unresolved high-risk cases.

---

## 6. High-Level Product Flow

1. **User scans QR / opens incident intake**
2. **Photo is uploaded**
3. **Input quality is checked**
4. **Adaptive follow-up questions are asked if needed**
5. **Diagnosis engine produces likely issue + evidence summary**
6. **Confidence-aware safety gate decides whether to trust, confirm, or escalate**
7. **Deterministic routing assigns the best safe resolver tier**
8. **Guided output artifact is generated**

---

## 7. Feature 1 — Smart Incident Intake

### Goal
Collect enough usable evidence for a safe first diagnosis without making the intake feel like a long form.

### Final Agreed Direction
Feature 1 should include the following as one coherent intake system:

#### 7.1 Entry
- QR-triggered launch
- mobile web / PWA flow
- no heavy login requirement for first-use troubleshooting
- prefilled charger metadata where available

#### 7.2 Evidence Capture
- primary action: **take or upload one charger photo**
- optional manual error code entry
- optional short symptom text

#### 7.3 Input Validation
Image quality is part of Feature 1, not a separate feature.

The intake flow should check for:
- blur,
- darkness,
- poor framing / incomplete visibility.

If the image is unusable:
- ask for retake.

If the image is weak but still usable:
- proceed with conservative trust and ask follow-up questions.

#### 7.4 Adaptive Follow-Up Questions
If the image is weak, incomplete, or the issue appears non-visual, ask only **2 to 4 short questions maximum**.

Candidate questions:
- Is the screen on?
- Is there a visible error code?
- What is the LED color or blink behavior?
- Is there visible physical damage?
- Did charging stop suddenly or never start?

### UX Principle
**Photo first, questions second.**

The system should avoid long upfront forms. It should feel like a smart intake, not an inspection checklist.

---

## 8. Feature 2 — Progressive Hybrid Diagnosis Engine

### Goal
Produce a useful diagnosis before the dataset arrives, then become more accurate once labeled competition data is available.

### Final Agreed Direction
Feature 2 should be a **progressive hybrid**, not a fixed overbuilt stack on day one.

### 8.1 Phase 1 Diagnosis Engine (Before Dataset)
Use a **multimodal VLM / API-first baseline**.

This baseline should:
- inspect charger images,
- read visible screen text / error codes,
- identify broad visible issue types,
- combine image evidence with follow-up answers,
- generate a short evidence summary.

This is the system’s working “brain” before supervised training exists.

### 8.2 Phase 2 Diagnosis Engine (After Round 1)
Once the organizer’s Round 1 data arrives, add a **lightweight fine-tuned known-fault classifier**.

This classifier should:
- improve accuracy on common known issues,
- validate or refine the zero-shot baseline,
- provide measurable accuracy gains for the competition report.

### 8.3 Phase 3 Diagnosis Upgrade (Optional)
If time allows, add **anomaly / novelty support** as a complement.

Its role is limited to:
- catching novel physical defects,
- flagging suspicious physical anomalies,
- improving evidence overlays,
- and supporting safe escalation.

It should not replace the main diagnosis path.

### 8.4 Feature 2 Output Schema
Feature 2 should output more than a single fault label.

Recommended fields:
- **Likely issue category**
- **Top likely fault**
- **Evidence summary**
- **Confidence band**
- **Confidence score**
- **Unknown flag**
- **Suggested severity type**

### Example Output
- Likely issue category: Connectivity
- Top likely fault: Charger offline / Wi-Fi disconnect
- Evidence summary: “Screen appears blank, no visible cable damage, user reports blinking red LED.”
- Confidence band: Medium
- Confidence score: 0.76
- Unknown flag: No
- Suggested severity type: Operational

---

## 9. Feature 3 — Confidence-Aware Safety Gate

### Goal
Convert raw model confidence into product-safe behavior.

### Final Agreed Direction
Feature 3 is not just confidence scoring. It is a **confidence-aware safety gate**.

### 9.1 What It Does
Feature 3 determines:
- whether the current evidence is strong enough,
- whether the system should ask for confirmation,
- whether it should proceed,
- or whether it should escalate conservatively.

### 9.2 Confidence Display Choice
Final decision:
- show both **human-readable confidence bands** and a **visible numeric score**.

The UI should lead with:
- High confidence,
- Needs confirmation,
- Escalate.

And also show a secondary numeric score such as:
- Confidence: 0.78

### 9.3 Confidence Bands
Initial working thresholds:

- **High confidence:** `>= 0.85`
- **Medium confidence:** `0.60 - 0.84`
- **Low confidence:** `< 0.60`

These are starting thresholds and should be adjusted after calibration.

### 9.4 Medium-Confidence Behavior
Final decision:
- for medium-confidence cases, ask **1 to 2 extra confirmation questions before routing**.

This is preferred over simply showing top-3 alternatives without interaction.

### 9.5 Low-Confidence Behavior
If the issue is low-confidence:
- do not give risky self-fix advice,
- escalate conservatively,
- and treat safety-adjacent ambiguity as high risk.

### 9.6 Safety Overrides Confidence
Even if confidence is high, visible evidence of dangerous physical failure should override normal behavior and force upward routing.

Examples:
- cable damage,
- connector deformation,
- overheating / burn marks,
- exposed electrical components,
- water ingress.

### 9.7 Nice-to-Have Later
Possible later additions:
- conformal prediction,
- deeper open-set uncertainty logic,
- anomaly-triggered uncertainty fusion.

These are not required for MVP.

---

## 10. Feature 4 — Deterministic Resolver Routing

### Goal
Translate diagnosis plus safety state into a concrete next-owner decision.

### Final Agreed Direction
Feature 4 should be a **deterministic resolver routing engine**, not a free-form AI decision.

### 10.1 Resolver Tiers

#### Tier 1 — EV Driver
Used only for the safest, lowest-risk actions a driver can perform without tools or technical access.

Examples:
- retry charging session,
- reconnect cable properly,
- safe user-facing retry flows.

#### Tier 2 — Local Site Resolver
Used for an **authorized local responder** with physical site access and basic SOP permission.

Important: this tier may **not exist at every site**.

Examples:
- facility staff,
- security,
- building management,
- maintenance crew.

Typical cases:
- isolator off,
- simple permitted local reset,
- basic site-side check.

#### Tier 3 — Remote Ops
Used for issues that can be handled through remote troubleshooting, backend inspection, or guided remote support.

Typical cases:
- connectivity issues,
- charger offline,
- remote reboot candidates,
- software hangs,
- backend sync problems.

#### Tier 4 — Technician
Used for:
- hardware damage,
- electrical risk,
- unresolved uncertainty,
- or any case needing skilled physical intervention.

Typical cases:
- cable damage,
- connector deformation,
- overheating,
- water ingress,
- exposed internal components,
- uncertain safety-relevant cases.

### 10.2 Site Capability Profile
Routing must depend on **resolver availability**, not just ideal workflow.

Each charger/site should have a lightweight capability profile:
- EV driver actions allowed? yes/no
- Local site resolver available? yes/no
- Remote ops available? yes/no
- Technician dispatch available? yes

### 10.3 Resolver-Availability Override
If a recommended tier depends on a resolver that the site does not have:
- move to the **next safe available tier**.

Example:
- recommended = Tier 2,
- no local site resolver exists,
- move to Tier 3 if safe and possible,
- otherwise Tier 4.

### 10.4 Routing Inputs
Feature 4 should consume:
- likely issue category,
- top likely fault,
- evidence summary,
- confidence band,
- confidence score,
- unknown flag,
- safety flags,
- confirmation answers,
- site capability profile.

### 10.5 Routing Rules

#### Rule 1 — Safety override
Visible dangerous hardware or electrical risk always forces Tier 4.

#### Rule 2 — Low-confidence override
Low-confidence safety ambiguity should route upward.

#### Rule 3 — Medium-confidence confirmation
If confirmation answers support a safe/simple explanation, allow Tier 1 or Tier 2.
If not, bump upward.

#### Rule 4 — User tier remains narrow
Tier 1 must stay restricted to low-risk end-user actions.

### 10.6 Routing Output
Feature 4 should return:
- **Recommended resolver**
- **Why**
- **Priority**
- **Next action**
- **Fallback if unresolved**

Example:
- Recommended resolver: Remote Ops
- Why: No visible hardware damage; symptoms suggest communication failure; no local responder available
- Priority: Medium
- Next action: Attempt remote reboot and backend connectivity check
- Fallback: Escalate to technician if still offline after remote recovery

---

## 11. Feature 5 — Guided Resolution & Escalation Output

### Goal
Produce a resolver-specific action artifact, not a generic answer.

### Final Agreed Direction
Feature 5 should use:
- **structured templates**
- plus **small retrieved snippets** from a curated troubleshooting library.

For technician escalation, it should also produce:
- a concise packet,
- plus an **annotated image / evidence highlight**.

### 11.1 Knowledge Source Strategy
For MVP, do **not** depend on exact manufacturer-manual retrieval from day one.

Instead use:
- a curated resolution library,
- built from solved explanations,
- internal SOP mappings,
- curated fault-action templates.

If manufacturer documents later become available and usable, retrieval can be upgraded.

### 11.2 Tier-Specific Output Types

#### Tier 1 — User Action Card
Contents:
- issue title,
- short explanation,
- max 3 safe steps,
- retrieved tip/snippet,
- “still not working?” escalation CTA.

#### Tier 2 — Local SOP Card
Contents:
- likely issue,
- short cause explanation,
- short SOP steps,
- retrieved caution/snippet,
- escalation condition.

#### Tier 3 — Remote Ops Action Pack
Contents:
- issue summary,
- evidence summary,
- confidence,
- suggested remote actions,
- escalation if unresolved.

#### Tier 4 — Technician Dispatch Packet
Contents:
- suspected issue,
- evidence summary,
- confidence,
- priority,
- safety warning,
- annotated image / highlighted evidence region,
- optional curated inspection note,
- optional curated parts hint later.

### 11.3 Guidance Guardrails
For Tier 1 and Tier 2:
- keep guidance short,
- no open-ended free-form repair generation,
- no long paragraphs,
- max 3 steps.

Templates control the structure. Retrieval only adds trusted specifics.

---

## 12. Current MVP Scope

### In Scope
- QR/PWA intake
- photo upload
- image quality gate
- adaptive follow-up questions
- zero-shot baseline diagnosis
- OCR / visible display reading
- evidence summary output
- confidence-aware safety gate
- deterministic routing
- site capability-aware routing
- tier-specific action artifacts
- curated troubleshooting library
- annotated technician packet

### Nice to Have
- lightweight fine-tuned classifier after Round 1
- anomaly overlay after Round 1 or Round 2
- simulated remote ops actions
- analytics dashboard
- cached demo scenarios

### Out of Scope for First MVP
- native mobile app
- full OCPP backend integration
- fully dynamic open-ended repair chatbot
- exact manufacturer-manual RAG from day one
- full conformal prediction in MVP
- automatic parts inference from a real inventory system
- full multilingual support

---

## 13. System Architecture (Conceptual)

```text
Feature 1: Smart Incident Intake
    -> QR entry
    -> photo upload
    -> image quality check
    -> adaptive follow-up questions

Feature 2: Progressive Hybrid Diagnosis Engine
    -> VLM/API-first visual baseline
    -> OCR / screen reading
    -> evidence summary
    -> later: fine-tuned known-fault classifier
    -> later optional: anomaly support

Feature 3: Confidence-Aware Safety Gate
    -> confidence band + score
    -> confirmation loop for medium confidence
    -> low-confidence escalation
    -> safety overrides

Feature 4: Deterministic Resolver Routing
    -> tier selection based on issue, risk, site capability, and confidence

Feature 5: Guided Resolution & Escalation Output
    -> user card / local SOP / remote ops pack / dispatch packet
```

---

## 14. Before Dataset Arrival — What We Build First

Because the organizer’s first dataset has not arrived yet, the product must be useful without waiting for supervised training.

### 14.1 Build Priority Before Round 1
1. Feature 1 complete enough for real intake
2. Feature 2 zero-shot baseline working
3. Feature 3 confidence bands and medium-confidence confirmation loop
4. Feature 4 routing logic and site capability override
5. Feature 5 templated action artifacts with a small curated knowledge library

### 14.2 What “working before data” means
Before Round 1 arrives, OmniTriage should already be able to:
- take a charger photo,
- collect short symptom evidence,
- produce a broad issue diagnosis,
- show confidence,
- assign a resolver tier,
- and generate a believable action artifact.

This gives the team an end-to-end MVP before any training data is used.

---

## 15. What We Do After Receiving the Dataset

This section captures the agreed post-dataset strategy.

### 15.1 Round 1 Arrival — Immediate Actions
When the organizer releases the first dataset:

#### A. Inspect and profile the dataset
Check:
- image count,
- image quality,
- class distribution,
- file structure,
- whether labels are explicit or embedded in “solved explanation” text,
- consistency of terminology,
- whether multiple fault types appear in one image,
- whether there are “normal” images or only faulty images.

#### B. Build a standardized fault taxonomy
The solved explanations will likely need to be normalized.

Create a controlled taxonomy with:
- broad issue categories,
- more specific fault labels,
- severity grouping,
- and routing implications.

Example top-level groups:
- Operational
- Connectivity
- Software / backend
- Physical hardware
- Safety-critical
- Unknown / other

#### C. Map free-text explanations into structured labels
Create a label-mapping layer from raw organizer wording into internal classes.

This may include:
- synonym consolidation,
- ambiguous-case review,
- removal of unsafe over-granularity,
- and a separate “unknown / unresolved” bucket.

#### D. Build the first curated troubleshooting library
Use the solved explanations to construct:
- action-card content,
- SOP snippets,
- remote-ops scripts,
- dispatch reasoning templates,
- and escalation conditions.

### 15.2 Add the Lightweight Known-Fault Classifier
Once the taxonomy is usable:
- train a lightweight classifier on the highest-frequency known faults,
- use it to improve performance on common cases,
- and compare it against the zero-shot baseline.

The supervised model should be additive, not a hard dependency.

### 15.3 Calibrate Confidence
After training:
- calibrate confidence scores,
- tune thresholds,
- review false-safe cases carefully,
- and prefer conservative escalation over optimistic self-fix routing.

### 15.4 Update Feature 5 Knowledge Base
Use the Round 1 solutions to improve:
- Tier 1 cards,
- Tier 2 SOP cards,
- Tier 3 action packs,
- Tier 4 dispatch templates.

This is the point where retrieval becomes more useful and better grounded.

---

## 16. What We Do After Round 2 Dataset / Alpha Testing

Round 2 should be treated as a **stress test**, not just more training data.

### Goals
- test generalization,
- identify label drift,
- measure where the system overcommits,
- improve the routing logic,
- and refine the confirmation questions.

### Actions
- compare Round 2 failure modes to Round 1,
- retrain or fine-tune only where it clearly helps,
- refine the fault taxonomy if needed,
- update curated knowledge snippets,
- tune thresholds and routing overrides,
- improve image quality rules,
- cache a few stable demo scenarios.

### Key Principle
Do not overfit to Round 2 in a way that makes the system brittle for Round 3.

---

## 17. What We Do Before and After Round 3 Late Data

Round 3 may arrive very late. The system therefore needs a late-stage operating plan.

### 17.1 Strategy for Late Data
The late-stage goal is not to rebuild the whole product. It is to:
- stay operational,
- absorb obvious new patterns,
- and fail safely when uncertain.

### 17.2 What to Update Quickly
If time is very limited:
- update the taxonomy mappings,
- add new known examples to evaluation sets,
- refresh action snippets if a new issue pattern appears,
- adjust threshold rules if clear drift appears.

### 17.3 What Not to Depend On
Do not make the final demo depend on:
- a full new training cycle,
- fragile manual-RAG ingestion,
- or a new complex pipeline introduced too late.

### 17.4 Late-Stage Safety Rule
When the late data introduces unfamiliar patterns:
- let the zero-shot baseline still interpret broadly,
- let the confidence gate become more conservative,
- and let routing escalate upward rather than forcing risky self-fix advice.

---

## 18. Data and ML Workstream Summary

### Before data
- zero-shot baseline only
- curated manual action templates
- end-to-end product flow working

### After Round 1
- structured taxonomy
- lightweight supervised classifier
- calibrated thresholds
- richer knowledge library

### After Round 2
- stress testing
- failure analysis
- threshold tuning
- routing refinement

### Before Round 3 / D-Day
- robustness over complexity
- conservative fallback
- stable demo flows
- selective updates only

---

## 19. UX and Presentation Principles

### For users
- minimal friction,
- photo-first flow,
- short action cards,
- clear escalation paths,
- no technical overload.

### For judges
- show that the system knows:
  - what it sees,
  - how sure it is,
  - why it routed the case,
  - and what happens next.

### For ops realism
- different tiers produce different artifacts,
- routing depends on site capability,
- outputs contain rationale,
- and evidence is visible, not hidden.

---

## 20. Key Product Risks and Mitigations

### Risk 1 — Overengineering before data arrives
**Mitigation:** build zero-shot baseline first; add supervised pieces only when data supports them.

### Risk 2 — Unsafe self-fix suggestions
**Mitigation:** narrow Tier 1, confidence gate, safety overrides, conservative escalation.

### Risk 3 — Assuming all stations have on-site staff
**Mitigation:** site capability profile and resolver-availability override.

### Risk 4 — Brittle RAG/manual dependency
**Mitigation:** curated troubleshooting library first; manufacturer retrieval only later if reliable.

### Risk 5 — Model confidence looks fake
**Mitigation:** calibrate scores, show both band and numeric value, tie confidence to behavior.

### Risk 6 — Same output for every tier
**Mitigation:** keep tier-specific output artifacts.

---

## 21. Suggested MVP Implementation Order

### Sprint 1
- QR/PWA shell
- image upload
- image quality gate
- basic follow-up questions

### Sprint 2
- zero-shot diagnosis baseline
- OCR / screen extraction
- evidence summary output

### Sprint 3
- confidence bands + numeric score
- medium-confidence confirmation loop
- safety overrides

### Sprint 4
- deterministic routing
- site capability support
- tier-specific action artifacts

### Sprint 5 (after Round 1)
- taxonomy creation
- label normalization
- supervised lightweight classifier
- threshold calibration
- knowledge library enrichment

---

## 22. Final Product Definition

OmniTriage is a **confidence-aware, resolver-specific EV charger troubleshooting platform** that begins with smart incident intake, diagnoses likely issues using a progressive hybrid engine, applies a safety-first confidence gate, routes incidents to the best safe available resolver, and delivers a tier-specific action artifact that helps resolve the issue or escalate it cleanly.

In short:

> **OmniTriage is not a model demo. It is a decision-and-action system for EV charger troubleshooting.**
