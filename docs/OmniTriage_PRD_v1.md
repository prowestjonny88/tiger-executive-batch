# OmniTriage PRD v1

**Product:** OmniTriage  
**Theme:** ESUM x RExharge Case Study Competition — Theme 2: EV Charger Troubleshooting  
**Document Type:** Product Requirements Document  
**Version:** v1.0  
**Status:** Draft  
**Authoring Basis:** Consolidated from the full design discussion and the current OmniTriage product specification.

---

## 1. Executive Summary

OmniTriage is a **confidence-aware EV charger troubleshooting platform** built to reduce charger downtime by routing each incident to the **safest appropriate resolver** as quickly as possible.

OmniTriage is intentionally designed as a **workflow system**, not just a classifier.

It does five core things:

1. Collects usable incident evidence through a **smart intake flow**.
2. Diagnoses likely issues through a **progressive hybrid diagnosis engine**.
3. Applies a **confidence-aware safety gate** before acting on uncertain outputs.
4. Routes the case through **deterministic resolver routing**.
5. Produces a **resolver-specific action artifact**: user guide, local SOP card, remote ops pack, or technician dispatch packet.

**Core promise:**

> **Photo + symptoms -> diagnosis -> confidence-aware triage -> safe next action**

The PRD is designed around the current reality that the organizer’s Round 1 dataset has **not yet arrived**. Therefore, OmniTriage must work **before supervised data exists**, improve after **Round 1**, harden after **Round 2**, and stay safe under **late Round 3 data shifts**.

---

## 2. Problem Statement

EV charger downtime is caused by a mix of:
- technical faults,
- connectivity issues,
- simple operational mistakes,
- and site-dependent context.

Today, troubleshooting is often manual, slow, and expensive. Some cases genuinely require technicians, but many do not. The product opportunity is to:

- detect likely issues quickly,
- distinguish safe/simple cases from risky ones,
- adapt to both staffed and self-service sites,
- and route the issue to the **best safe available resolver**.

The value is not only better fault recognition. The value is:
- fewer wasted truck rolls,
- faster issue recovery,
- safer escalation,
- better use of human support resources,
- and higher charger uptime.

---

## 3. Product Goal

### Primary Goal
Help RExharge reduce unnecessary technician dispatches and accelerate charger recovery by turning incident reports into **safe, explainable next-action decisions**.

### Product Promise
In under a minute, OmniTriage should gather enough evidence to make a **safe first triage decision** and hand the issue to the right resolver with the right action artifact.

### Non-Goals
OmniTriage is not:
- a generic image classifier demo,
- a free-form chatbot that improvises repair advice,
- a fully autonomous repair system,
- a hard dependency on manufacturer manuals from day one,
- or a requirement for native mobile app installation.

---

## 4. Users and Resolver Types

OmniTriage serves multiple actors, but each receives a different output artifact.

### 4.1 Primary Users

#### EV Driver
A non-technical end user who may safely perform very limited actions.

#### Local Site Resolver
An authorized local person with physical site access and basic SOP permission. This is **not guaranteed to exist** at every station.

Examples:
- security staff,
- facility staff,
- mall management,
- condo management,
- maintenance personnel.

#### Remote Ops
A remote support / operations team capable of backend checks or guided support.

#### Technician
A trained physical responder for hardware, electrical, or unresolved high-risk cases.

### 4.2 Secondary Internal Users
- Competition judges reviewing the product’s credibility and usefulness.
- Team members using stored incidents and results for evaluation and iteration.

---

## 5. Jobs To Be Done

### EV Driver
- When charging fails, I want to quickly submit what I see so I can know whether I can safely fix it myself or need support.

### Local Site Resolver
- When a charger appears down on-site, I want a short SOP card that tells me exactly what local action is safe and permitted.

### Remote Ops
- When a charger issue cannot be resolved locally, I want an evidence-backed action pack that helps me decide the next remote steps.

### Technician
- When a case requires physical intervention, I want a concise dispatch packet with evidence, priority, and inspection focus.

### Product / Competition Team
- When the organizer releases new datasets, I want the system to improve without collapsing if the data changes late.

---

## 6. Design Principles

1. **Workflow over raw model output**  
   The system must not stop at “what is wrong.” It must answer what is likely happening, how sure it is, who should act next, and what they should do.

2. **Conservative by design**  
   When uncertain, the product should not bluff. It should ask for a bit more evidence, show uncertainty honestly, and escalate upward when risk is non-trivial.

3. **Web-first, fast-entry experience**  
   The product should work as a QR-triggered mobile web flow / PWA, not a heavy native app.

4. **Multimodal, but scoped**  
   Vision alone is not enough. The system should combine photo evidence, screen/error-code extraction, and short symptom confirmation questions.

5. **Deterministic routing**  
   Routing should be based on hardcoded business and safety rules, not open-ended generative decisions.

6. **Works before the dataset arrives**  
   The product must be useful before Round 1 and improve after Round 1.

7. **Site-aware resolver logic**  
   Not every site has on-site staff. Routing must depend on site capability, not role assumptions alone.

---

## 7. Product Scope

### In Scope for PRD v1 / MVP
- QR/PWA intake flow
- Photo upload
- Image quality gate
- Adaptive follow-up questions
- Zero-shot baseline diagnosis
- OCR / visible display reading
- Evidence summary output
- Confidence-aware safety gate
- Deterministic resolver routing
- Site capability-aware routing
- Tier-specific action artifacts
- Curated troubleshooting library
- Annotated technician packet

### Nice-to-Have / Next Iteration
- Lightweight fine-tuned classifier after Round 1
- Anomaly overlay after Round 1 or Round 2
- Simulated remote ops actions
- Analytics dashboard
- Cached demo scenarios
- Manufacturer-specific retrieval later if docs are available and clean

### Out of Scope for First MVP
- Native mobile app
- Full OCPP backend integration
- Fully dynamic open-ended repair chatbot
- Exact manufacturer-manual RAG from day one
- Full conformal prediction in MVP
- Automatic parts inference from a real inventory system
- Full multilingual support

---

## 8. Product Requirements by Feature

## Feature 1 — Smart Incident Intake

### Objective
Collect enough usable evidence for a safe first diagnosis without making the intake feel like a long form.

### Requirements

#### 8.1 Entry
- The system shall support QR-triggered launch.
- The system shall run as a mobile web / PWA flow.
- The system shall avoid heavy login requirements for first-use troubleshooting.
- The system shall prefill charger metadata where available.

#### 8.2 Evidence Capture
- The primary action shall be **take or upload one charger photo**.
- The system shall support optional manual error code entry.
- The system shall support optional short symptom text.

#### 8.3 Input Validation
- Image quality checking is part of Feature 1.
- The system shall check for:
  - blur,
  - darkness,
  - poor framing / incomplete visibility.
- If the image is unusable, the system shall request a retake.
- If the image is weak but usable, the system shall proceed conservatively and ask follow-up questions.

#### 8.4 Adaptive Follow-Up Questions
- If the issue appears non-visual, incomplete, or weakly evidenced, the system shall ask **2 to 4 short follow-up questions maximum**.
- Supported questions may include:
  - Is the screen on?
  - Is there a visible error code?
  - What is the LED color or blink behavior?
  - Is there visible physical damage?
  - Did charging stop suddenly or never start?

### UX Rule
**Photo first, questions second.**

---

## Feature 2 — Progressive Hybrid Diagnosis Engine

### Objective
Produce a useful diagnosis before the dataset arrives, then become more accurate once labeled competition data is available.

### Requirements

#### 8.5 Phase 1 Diagnosis Engine (Before Dataset)
- The system shall use a **multimodal VLM / API-first baseline** initially.
- The baseline shall:
  - inspect charger images,
  - read visible screen text / error codes,
  - identify broad visible issue types,
  - combine image evidence with follow-up answers,
  - generate a short evidence summary.

#### 8.6 Phase 2 Diagnosis Engine (After Round 1)
- Once Round 1 data arrives, the system shall support a **lightweight fine-tuned known-fault classifier**.
- The classifier shall:
  - improve accuracy on common known issues,
  - validate or refine the zero-shot baseline,
  - support measurable evaluation for the technical report.

#### 8.7 Phase 3 Diagnosis Upgrade (Optional)
- If time allows, the system may add anomaly / novelty support as a complement.
- Its role shall be limited to:
  - catching novel physical defects,
  - flagging suspicious physical anomalies,
  - improving evidence overlays,
  - supporting safe escalation.
- It shall not replace the main diagnosis path.

#### 8.8 Feature 2 Output Schema
The system shall output more than a single fault label.

Required fields:
- **Likely issue category**
- **Top likely fault**
- **Evidence summary**
- **Confidence band**
- **Confidence score**
- **Unknown flag**
- **Suggested severity type**

Example:
- Likely issue category: Connectivity
- Top likely fault: Charger offline / Wi-Fi disconnect
- Evidence summary: “Screen appears blank, no visible cable damage, user reports blinking red LED.”
- Confidence band: Medium
- Confidence score: 0.76
- Unknown flag: No
- Suggested severity type: Operational

---

## Feature 3 — Confidence-Aware Safety Gate

### Objective
Convert raw model confidence into product-safe behavior.

### Requirements

#### 8.9 Confidence Model
- The system shall show both a **human-readable confidence band** and a **visible numeric score**.
- The UI shall lead with:
  - High confidence,
  - Needs confirmation,
  - Escalate.
- The UI shall also display a secondary score such as `Confidence: 0.78`.

#### 8.10 Working Confidence Thresholds
Initial thresholds:
- **High confidence:** `>= 0.85`
- **Medium confidence:** `0.60 - 0.84`
- **Low confidence:** `< 0.60`

These are provisional and shall be adjusted after calibration.

#### 8.11 Medium-Confidence Behavior
- For medium-confidence cases, the system shall ask **1 to 2 extra confirmation questions before routing**.
- The product shall not rely only on showing top-3 alternatives without interaction.

#### 8.12 Low-Confidence Behavior
- If the issue is low-confidence, the system shall:
  - avoid risky self-fix advice,
  - escalate conservatively,
  - treat safety-adjacent ambiguity as high risk.

#### 8.13 Safety Overrides Confidence
Even if confidence is high, visible dangerous physical failure shall override normal behavior and force upward routing.

Examples:
- cable damage,
- connector deformation,
- overheating / burn marks,
- exposed electrical components,
- water ingress.

#### 8.14 Nice-to-Have Later
Potential later additions:
- conformal prediction,
- deeper open-set uncertainty logic,
- anomaly-triggered uncertainty fusion.

These are not required for MVP.

---

## Feature 4 — Deterministic Resolver Routing

### Objective
Translate diagnosis plus safety state into a concrete next-owner decision.

### Requirements

#### 8.15 Resolver Tiers

##### Tier 1 — EV Driver
Used only for the safest, lowest-risk actions a driver can perform without tools or technical access.

Examples:
- retry charging session,
- reconnect cable properly,
- safe user-facing retry flows.

##### Tier 2 — Local Site Resolver
Used for an authorized local responder with physical site access and basic SOP permission.

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

##### Tier 3 — Remote Ops
Used for issues that can be handled through remote troubleshooting, backend inspection, or guided remote support.

Typical cases:
- connectivity issues,
- charger offline,
- remote reboot candidates,
- software hangs,
- backend sync problems.

##### Tier 4 — Technician
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

#### 8.16 Site Capability Profile
Routing must depend on resolver availability, not just ideal workflow.

Each charger/site shall have a lightweight capability profile:
- EV driver actions allowed? yes/no
- Local site resolver available? yes/no
- Remote ops available? yes/no
- Technician dispatch available? yes

#### 8.17 Resolver-Availability Override
- If a recommended tier depends on a resolver that the site does not have, the system shall move to the **next safe available tier**.

Example:
- recommended = Tier 2,
- no local site resolver exists,
- move to Tier 3 if safe and possible,
- otherwise Tier 4.

#### 8.18 Routing Inputs
Feature 4 shall consume:
- likely issue category,
- top likely fault,
- evidence summary,
- confidence band,
- confidence score,
- unknown flag,
- safety flags,
- confirmation answers,
- site capability profile.

#### 8.19 Routing Rules
- **Rule 1 — Safety override:** Visible dangerous hardware or electrical risk always forces Tier 4.
- **Rule 2 — Low-confidence override:** Low-confidence safety ambiguity shall route upward.
- **Rule 3 — Medium-confidence confirmation:** If confirmation answers support a safe/simple explanation, allow Tier 1 or Tier 2; otherwise bump upward.
- **Rule 4 — User tier remains narrow:** Tier 1 must stay restricted to low-risk end-user actions.

#### 8.20 Routing Output
Feature 4 shall return:
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

## Feature 5 — Guided Resolution & Escalation Output

### Objective
Produce a resolver-specific action artifact, not a generic answer.

### Requirements

#### 8.21 Output Strategy
Feature 5 shall use:
- **structured templates**
- plus **small retrieved snippets** from a curated troubleshooting library.

For technician escalation, it shall also produce:
- a concise packet,
- plus an **annotated image / evidence highlight**.

#### 8.22 Knowledge Source Strategy
For MVP, the system shall **not** depend on exact manufacturer-manual retrieval from day one.

Instead it shall use:
- a curated resolution library,
- built from solved explanations,
- internal SOP mappings,
- curated fault-action templates.

If manufacturer documents later become available and usable, retrieval may be upgraded.

#### 8.23 Tier-Specific Output Types

##### Tier 1 — User Action Card
Contents:
- issue title,
- short explanation,
- max 3 safe steps,
- retrieved tip/snippet,
- “still not working?” escalation CTA.

##### Tier 2 — Local SOP Card
Contents:
- likely issue,
- short cause explanation,
- short SOP steps,
- retrieved caution/snippet,
- escalation condition.

##### Tier 3 — Remote Ops Action Pack
Contents:
- issue summary,
- evidence summary,
- confidence,
- suggested remote actions,
- escalation if unresolved.

##### Tier 4 — Technician Dispatch Packet
Contents:
- suspected issue,
- evidence summary,
- confidence,
- priority,
- safety warning,
- annotated image / highlighted evidence region,
- optional curated inspection note,
- optional curated parts hint later.

#### 8.24 Guidance Guardrails
For Tier 1 and Tier 2:
- keep guidance short,
- no open-ended free-form repair generation,
- no long paragraphs,
- max 3 steps.

Templates control the structure. Retrieval only adds trusted specifics.

---

## 9. User Flows

### 9.1 Core Flow
1. User scans QR / opens incident intake.
2. User uploads photo.
3. System checks input quality.
4. System asks adaptive follow-up questions if needed.
5. Diagnosis engine produces likely issue + evidence summary.
6. Confidence-aware safety gate decides whether to trust, confirm, or escalate.
7. Deterministic routing assigns the best safe resolver tier.
8. Resolver-specific output artifact is generated.

### 9.2 Medium-Confidence Flow
1. User uploads photo.
2. Diagnosis returns medium confidence.
3. System asks 1–2 confirmation questions.
4. Routing re-evaluates with the new answers.
5. Action card or escalation output is generated.

### 9.3 Self-Service Site Flow
1. Diagnosis suggests Tier 2-type issue.
2. Site capability profile shows no local site resolver.
3. Resolver-availability override bumps case to Tier 3 or Tier 4.
4. Appropriate output artifact is generated.

---

## 10. Success Metrics

### Product / Operational Metrics
- % of incidents routed to non-technician tiers safely
- Reduction in unnecessary technician dispatches
- Median time to first triage decision
- Median time to next-action artifact generation
- % of incidents escalated conservatively when uncertain

### Model / Diagnostic Metrics
- Broad issue-category accuracy
- Known-fault classifier accuracy after Round 1
- OCR extraction success rate on visible screens
- Confidence calibration quality
- False-safe rate on safety-relevant cases

### UX Metrics
- Intake completion rate
- Photo retake rate
- % of medium-confidence cases resolved after 1–2 confirmation questions
- Time to complete intake

### Competition / Demo Metrics
- End-to-end demo stability
- Clarity of routing rationale
- Visual quality of technician dispatch packet
- Ability to survive late data shifts without unsafe output

---

## 11. Functional Acceptance Criteria

### Feature 1
- User can launch via QR or direct web link.
- User can upload a charger photo.
- System can reject clearly unusable images.
- System asks no more than 4 follow-up questions.

### Feature 2
- Before dataset arrival, system can generate a broad issue diagnosis and evidence summary.
- After Round 1, system can optionally use a fine-tuned classifier for known common classes.
- Output schema includes all required fields.

### Feature 3
- UI displays both confidence band and numeric score.
- Medium-confidence cases trigger confirmation questions.
- Low-confidence risky cases do not produce low-tier self-fix advice.

### Feature 4
- Resolver tiers are assigned deterministically.
- Site capability overrides work correctly.
- Routing output includes rationale, priority, next action, and fallback.

### Feature 5
- Tier 1 and Tier 2 outputs are max 3 steps.
- Tier 4 output includes annotated image/evidence highlight.
- Output artifacts differ meaningfully by resolver tier.

---

## 12. Non-Functional Requirements

- **Safety:** Avoid unsafe self-fix guidance in ambiguous or risky cases.
- **Explainability:** Each routing decision must be explainable in one sentence.
- **Responsiveness:** End-to-end first triage should feel fast enough for demo use.
- **Scalability of logic:** Routing and knowledge artifacts should be easy to update as new data arrives.
- **Robustness:** The product must remain usable before and after staged dataset changes.

---

## 13. Dependencies

### Known Current Dependency State
The organizer’s first dataset has **not yet been received**.

### External Dependencies
- Round 1 dataset: faulty EV charger photos with solved explanation
- Round 2 dataset: alpha-testing data during mentoring
- Round 3 dataset: late-arriving data before D-Day

### Internal Build Dependencies
- Curated troubleshooting library
- Site capability profile model
- Zero-shot visual baseline integration
- OCR / screen text extraction

---

## 14. Dataset Arrival Plan

## 14.1 Before Dataset Arrival — What We Build First
Because the organizer’s first dataset has not arrived yet, the product must be useful without supervised training.

### Build Priority Before Round 1
1. Feature 1 complete enough for real intake
2. Feature 2 zero-shot baseline working
3. Feature 3 confidence bands and medium-confidence confirmation loop
4. Feature 4 routing logic and site capability override
5. Feature 5 templated action artifacts with a small curated knowledge library

### Working Definition Before Data
Before Round 1 arrives, OmniTriage should already be able to:
- take a charger photo,
- collect short symptom evidence,
- produce a broad issue diagnosis,
- show confidence,
- assign a resolver tier,
- generate a believable action artifact.

---

## 14.2 After Round 1 Dataset Arrival

### Immediate Actions
#### A. Inspect and profile the dataset
Check:
- image count,
- image quality,
- class distribution,
- file structure,
- whether labels are explicit or embedded in solved explanation text,
- consistency of terminology,
- whether multiple fault types appear in one image,
- whether “normal” images exist.

#### B. Build a standardized fault taxonomy
Create a controlled taxonomy with:
- broad issue categories,
- more specific fault labels,
- severity grouping,
- routing implications.

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
- separate unknown / unresolved bucket.

#### D. Build the first curated troubleshooting library
Use the solved explanations to construct:
- action-card content,
- SOP snippets,
- remote-ops scripts,
- dispatch reasoning templates,
- escalation conditions.

### Add the Lightweight Known-Fault Classifier
- Train a lightweight classifier on the highest-frequency known faults.
- Use it to improve performance on common cases.
- Compare it against the zero-shot baseline.

### Calibrate Confidence
- Calibrate confidence scores.
- Tune thresholds.
- Review false-safe cases carefully.
- Prefer conservative escalation over optimistic self-fix routing.

### Update Feature 5 Knowledge Base
Use Round 1 solutions to improve:
- Tier 1 cards,
- Tier 2 SOP cards,
- Tier 3 action packs,
- Tier 4 dispatch templates.

---

## 14.3 After Round 2 Dataset / Alpha Testing
Round 2 should be treated as a **stress test**, not just more training data.

### Goals
- test generalization,
- identify label drift,
- measure overcommitment,
- improve routing logic,
- refine confirmation questions.

### Actions
- Compare Round 2 failure modes to Round 1.
- Retrain or fine-tune only where it clearly helps.
- Refine the fault taxonomy if needed.
- Update curated knowledge snippets.
- Tune thresholds and routing overrides.
- Improve image quality rules.
- Cache a few stable demo scenarios.

### Principle
Do not overfit to Round 2 in a way that makes the system brittle for Round 3.

---

## 14.4 Round 3 Late Data Strategy
Round 3 may arrive very late. The goal is not to rebuild the whole product but to remain operational, absorb obvious new patterns, and fail safely.

### What to Update Quickly
- Update taxonomy mappings.
- Add new known examples to evaluation sets.
- Refresh action snippets if a new issue pattern appears.
- Adjust threshold rules if clear drift appears.

### What Not to Depend On
- Full new training cycle
- Fragile manual-RAG ingestion
- New complex pipeline introduced too late

### Late-Stage Safety Rule
When late data introduces unfamiliar patterns:
- let the zero-shot baseline still interpret broadly,
- make the confidence gate more conservative,
- let routing escalate upward rather than forcing risky self-fix advice.

---

## 15. Risks and Mitigations

### Risk 1 — Overengineering before data arrives
**Mitigation:** Build zero-shot baseline first; add supervised pieces only when data supports them.

### Risk 2 — Unsafe self-fix suggestions
**Mitigation:** Narrow Tier 1, use the confidence gate, enforce safety overrides, escalate conservatively.

### Risk 3 — Assuming all stations have on-site staff
**Mitigation:** Use site capability profile and resolver-availability override.

### Risk 4 — Brittle RAG/manual dependency
**Mitigation:** Use curated troubleshooting library first; only upgrade retrieval later if manufacturer docs are reliable.

### Risk 5 — Model confidence looks fake
**Mitigation:** Calibrate scores, show both band and numeric value, tie confidence to behavior.

### Risk 6 — Same output for every tier
**Mitigation:** Keep tier-specific output artifacts.

---

## 16. Suggested MVP Build Order

### Sprint 1
- QR/PWA shell
- Image upload
- Image quality gate
- Basic follow-up questions

### Sprint 2
- Zero-shot diagnosis baseline
- OCR / screen extraction
- Evidence summary output

### Sprint 3
- Confidence-aware safety gate
- Resolver routing logic
- Tier-specific output templates

### Sprint 4
- Curated troubleshooting library
- Annotated technician packet
- Site capability overrides
- Stable demo cases

### Post-Round 1 Upgrade Sprint
- Taxonomy and label mapping
- Lightweight classifier training
- Confidence calibration
- Knowledge library expansion

---

## 17. Open Questions for PRD v2

- What exact fault taxonomy should be used after Round 1 analysis?
- Which chargers/sites have local site resolvers vs self-service only?
- Will any reliable manufacturer documents or SOP PDFs be available for retrieval?
- Is anomaly support worth including before D-Day, or should it remain demo-only / optional?
- Should remote ops actions be simulated only, or lightly integrated with a backend mock panel?

---

## 18. Summary Decision

OmniTriage PRD v1 defines a **safe, workflow-first troubleshooting product** that is immediately buildable before dataset arrival and becomes stronger once real competition data is available.

Its final product shape is:

> **Smart intake -> progressive hybrid diagnosis -> confidence-aware safety gate -> deterministic resolver routing -> resolver-specific action artifact**

That is the product we should build.
