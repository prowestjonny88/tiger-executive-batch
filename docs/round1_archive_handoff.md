# Round 1 Archive Handoff

Round 1 has been removed from the live repository tree and should be kept outside the current Theme 2 repo.

This file records what the removed archive contained and why it is no longer part of the live app.

## Current Product Direction

The active product is ESUM Theme 2 / Round 2:

```text
upload/demo evidence
-> Theme 2 VLM or heuristic perception
-> optional EV app screenshot parsing
-> deterministic organizer rule mapping
-> customer or after-sales output
-> audit/history
```

The live public contract is based on organizer-required fields:

- observation result
- charger serial number when readable
- charger brand/model when readable
- fault type
- customer or after-sales routing

## What Round 1 Was

Round 1 was the earlier OmniTriage-style implementation. It included:

- known-case retrieval
- embeddings / pgvector indexing
- issue-family diagnosis
- resolver-tier routing
- KB snippets
- guidance generation
- replay tests
- Round 1 ROI and known-case dataset assets

Those concepts are intentionally not part of the current Theme 2 runtime.

## Removed Archive Contents

The removed archive folder was:

```text
_archive/round1/
```

It contained:

```text
_archive/round1/backend/
```

- `db/legacy_replay.py`
- `services/confidence.py`
- `services/diagnosis.py`
- `services/diagnosis_evidence.py`
- `services/diagnosis_fallback.py`
- `services/diagnosis_gate.py`
- `services/diagnosis_gemini.py`
- `services/diagnosis_perception.py`
- `services/diagnosis_retrieval.py`
- `services/diagnosis_synthesis.py`
- `services/embeddings.py`
- `services/guidance.py`
- `services/known_case_retrieval.py`
- `services/round1_dataset.py`
- `services/routing.py`
- `services/triage.py`
- old Round 1 backend tests

```text
_archive/round1/data/
```

- `data/kb/snippets.json`
- `data/round1/manifest.csv`
- `data/round1/known_cases_seed.jsonl`
- `data/round1/label_map.yaml`
- `data/round1/roi_annotations.csv`
- `data/round1/roi_label_normalization.csv`
- `data/round1/roi_ontology.csv`
- Round 1 image samples
- Round 1 dataset docs

```text
_archive/round1/docs/
```

- `OmniTriage_PRD_v1.md`
- `OmniTriage_Comprehensive_Execution_Plan.md`
- `OmniTriage_Technical_Architecture.md`
- `OmniTriage_Tech_Stack.md`
- `omnitriage_product_spec.md`
- `prd_task_breakdown.md`
- `briefing_key_points.md`
- `setup_guide.md`
- `progress_tracker.md`

```text
_archive/round1/frontend/
```

- `components/intake-form.tsx`
- `components/intake-panels.tsx`

## Replacement Map

| Old Round 1 concept | Current Theme 2 replacement |
|---|---|
| known-case retrieval | deterministic Theme 2 rule mapping |
| embeddings / pgvector | no live vector index |
| issue family | `fault_type_v2` |
| resolver tier | `recipient_type` and optional `assigned_team_id` |
| KB snippets | `data/round2/theme2_rules.json` |
| broad guidance generation | rule-backed `action_message` |
| Round 1 ROI assets | Round 2 manifest/evaluation metadata |

## Do Not Reintroduce

Do not copy these back into the live runtime unless the project scope changes again:

- pgvector setup
- known-case retrieval
- Round 1 KB snippets
- `issue_family`
- `resolver_tier`
- old route response fields such as `diagnosis`, `routing`, `artifact`, or `kb_retrieval`

## Verification After Removal

Use:

```powershell
cd backend
py -m pytest -q
py -m pyright -p pyrightconfig.json
```

```powershell
cd frontend
npm.cmd run build
```

Search for accidental live references:

```powershell
rg "known_case|pgvector|resolver_tier|issue_family|kb_retrieval" backend frontend data scripts docs README.md
```
