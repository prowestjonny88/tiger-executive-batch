# OmniTriage - Comprehensive Execution Plan

_Re-aligned to the implemented Round 1 hard-replacement runtime on 2026-04-17_

## 1. Purpose
This is the top-level direction-setting document for the repo after the Round 1 hard replacement.

It exists to:
- lock the current product/runtime direction
- prevent drift back to the retired organizer/classifier-first stack
- align implementation, demo, and reporting

## 2. Final Product Claim
OmniTriage is a confidence-aware EV charger incident triage system that uses Round 1 package intelligence, confidence-aware diagnosis, and deterministic routing to direct each incident to the lowest safe resolver tier.

Core workflow:

`evidence intake -> diagnosis -> confidence -> resolver-tier routing -> next action`

## 3. Current Project State

### Repo direction now implemented
The repo now supports:
- Next.js frontend + FastAPI backend
- Round 1 package-backed intelligence from `data/round1/`
- retrieval-first diagnosis with optional Gemini VLM assist
- Postgres + pgvector primary persistence
- history/replay compatibility for older SQLite-era records
- result/guidance/escalation/history surfaces aligned to the new contract

### Major retired direction
The repo is no longer centered on:
- organizer-native `issue_type`
- shared `basic_conditions`
- `workflow.outcome = resolved|escalate`
- active runtime use of the old visual classifier path

## 4. Locked Product Direction

### Product framing
Locked:
- confidence-aware EV charger incident triage system
- not a plain fault classifier
- not a free-form repair chatbot

### Internal taxonomy
Locked top-level taxonomy:
- `issue_family`
- `fault_type`
- `evidence_type`
- `hazard_level`
- `resolver_tier`

Locked issue families:
- `no_power`
- `tripping`
- `charging_slow`
- `not_responding`
- `unknown_mixed`

Locked resolver tiers:
- `driver`
- `local_site`
- `remote_ops`
- `technician`

## 5. Runtime Architecture

### Intake layer
Inputs:
- image/photo evidence
- manual error code
- symptom text
- follow-up answers
- demo scenario id

### Dataset-backed intelligence layer
Canonical source:
- `data/round1/manifest.csv`
- `data/round1/roi_annotations.csv`
- `data/round1/roi_ontology.csv`
- `data/round1/roi_label_normalization.csv`
- `data/round1/label_map.yaml`
- `data/round1/known_cases_seed.jsonl`
- `data/round1/images/*`

Responsibilities:
- package loading
- label/taxonomy mapping
- known-case record building
- retrieval seed source of truth

### Diagnosis layer
Active contributors:
- package-backed known-case retrieval
- OCR/text extraction
- optional Gemini VLM synthesis

Important rule:
- the old classifier runtime is not active in the current path

### Confidence layer
Computes:
- confidence score
- confidence band
- novelty/uncertainty behavior
- follow-up need

### Routing layer
Deterministic outputs:
- `resolver_tier`
- `routing_rationale`
- `recommended_next_step`
- `fallback_action`

Locked policy:
- hazardous cases route upward
- non-hazardous `unknown_mixed` defaults to `remote_ops`
- routing does not come directly from free-form LLM output

### Guidance layer
Outputs:
- resolver-tier guidance
- required proof next
- safety notes
- evidence focus

## 6. Persistence Direction

### Locked
- primary store: PostgreSQL
- local dev target: Dockerized Postgres + pgvector

### Compatibility
- old SQLite data is retained only for replay/history compatibility
- compatibility logic belongs only in read paths

## 7. Frontend Direction

The frontend shell is still reusable, but it must now center:
- `issue_family`
- `fault_type`
- `hazard_level`
- `resolver_tier`
- `routing_rationale`
- `recommended_next_step`

Major surfaces aligned to this direction:
- result
- guidance
- escalation
- history/replay

## 8. Immediate Next Work
- finish doc alignment across the repo
- replace deprecated FastAPI startup hook with lifespan
- harden OCR/text extraction beyond current extraction + VLM assist
- add stronger retrieval/reporting evaluation artifacts
- clean or archive outdated classifier-era docs and findings

## 9. Source of Truth Rule
When docs disagree, use:
1. `docs/OmniTriage_Comprehensive_Execution_Plan.md`
2. `docs/progress_tracker.md`
3. `docs/prd_task_breakdown.md`
