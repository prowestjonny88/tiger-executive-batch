# Theme 2 Progress Tracker

_Last updated: 2026-05-14_

## Direction Lock

The live repo is now aligned to the ESUM Theme 2 / Round 2 scope:

- input component detection: charger, EVDB, isolator
- organizer observation result
- charger serial number and brand/model when visible
- official Theme 2 fault type
- customer or after-sales recipient routing

## Current Implementation Truth

Active runtime:

```text
intake -> Theme 2 perception -> organizer rule mapping -> follow-up prompts -> audit/history
```

Archived runtime:

```text
Round 1 known-case retrieval, issue_family, resolver_tier, pgvector KB index
```

Archived files live under `_archive/round1/`.

## Implemented

- Theme 2 backend response contract
- Theme 2 perception service with Gemini and deterministic fallback paths
- Organizer rule mapper backed by `data/round2/theme2_rules.json`
- Theme 2 triage orchestrator
- FastAPI route rewiring while preserving `/api/v1/*` paths
- Theme 2 frontend API types and pages
- Theme 2 demo scenarios
- Upload proxy route at `/api/uploads`
- Theme 2 tests replacing old Round 1 tests

## Remaining Follow-Ups

- Add Drive-backed manifest generation when dataset access is available.
- Add optional curated `data/round2/sample_images/`.
- Add end-to-end browser tests if a Playwright setup is introduced.
