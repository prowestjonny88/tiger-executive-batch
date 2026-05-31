# Round 2 Evaluation And Dataset Methodology

This document describes how the project handles Dataset 2 media, weak labels, clean evaluation cases, quarantined cases, and unseen-image checks.

## Dataset Policy

Raw Dataset 2 images/videos stay outside Git. The repository tracks only reproducible metadata and small structured artifacts:

- `data/round2/theme2_rules.json`
- `data/round2/manifest.csv`
- `data/round2/manifest_summary.json`
- `data/round2/evaluation_cases.json`
- `data/round2/manual_review_cases.json`
- `data/round2/pseudo_label_summary.json`

Ignored local data includes:

- `data/round2/images/`
- `data/round2/raw/`
- `data/round2/video_frames/`
- `data/round2/unseen_external/`
- pseudo-label JSONL outputs
- eval reports
- videos

Folder labels are weak labels only. Runtime decisions come from Theme 2 perception plus deterministic organizer rules.

## Manifest Workflow

```powershell
py scripts\build_round2_manifest.py --write-summary
```

The manifest builder stores relative paths only and maps folders to weak Theme 2 labels. It can warn or fail for unknown labels depending on flags.

## Weak-Label Sanity

```powershell
py scripts\evaluate_round2_cases.py --mode weak-label-sanity --show-failures
```

This mode includes expected labels in the incident hint. It is useful for rule/pipeline regression checks, but it is not visual accuracy because fallback logic can read the hint.

## Blind Image Eval

```powershell
py scripts\evaluate_round2_cases.py --mode blind-image-eval --show-failures
```

This mode uses a neutral hint:

```text
Photo uploaded for EV charger troubleshooting.
```

It does not leak expected component, observation, fault type, recipient, or folder-derived labels. With Gemini enabled, this is the closest local proxy for judging unseen images.

## Gemini Checks

```powershell
$env:GEMINI_API_KEY="your_key"
py scripts\gemini_smoke_test.py
py scripts\evaluate_round2_cases.py --mode blind-image-eval --show-failures
```

Fallback-only blind results are conservative behavior checks, not proof of visual accuracy.

## Manual Review And Quarantine

`data/round2/manual_review_cases.json` stores low-confidence, conflicting, unclear, or unsupported cases. A case should be promoted only after a reviewer fills the relevant `manual_*` fields and sets:

```text
manual_review_status = reviewed_include_eval
```

Promotion command:

```powershell
py scripts\promote_manual_review_to_eval.py
```

Default output is `data/round2/evaluation_cases.reviewed.json`; it does not overwrite the clean baseline unless `--replace` is passed.

## Serial And Brand OCR Ground Truth

Do not invent serial or brand/model values from VLM guesses. Only set `serial_number_expected` and `brand_model_expected` after human review.

Until reviewed expected values exist, runtime extraction can still show visible charger identity, but report metrics must describe exact OCR validation as partial or `n/a`.

## EV App Screenshot Evidence

For charger red-light or blinking-red cases, an optional EV app screenshot can be uploaded. The VLM extracts visible app status text, error codes, fault hints, and flash-count evidence. This can refine blinking-red rules and strengthen evidence notes, but it does not replace the primary hardware photo.

## Coverage Guardrail

```powershell
py scripts\check_round2_eval_coverage.py
```

The coverage checker reports missing recommended coverage, including EVDB single phase, EVDB three phase, missing/wrong specs, isolator ON/OFF, blinking-red follow-up cases, and exact charger OCR ground truth.

Current committed baseline status:

- 21 total eval cases.
- Charger image/text-follow-up coverage is usable for regression checks.
- EVDB coverage is still thin: three-phase and one MCB-tripped case exist, but reviewed single-phase, missing MCB/RCCB, and wrong-spec image cases are still missing.
- Isolator image cases are still missing from the clean eval pack.
- Exact serial/brand OCR ground-truth cases are still missing because those values require human transcription.

These gaps are intentionally left as warnings instead of fabricated labels. Promote cases only after `manual_review_cases.json` has reviewer-filled final labels.

Use strict mode only when the eval pack is expected to satisfy those recommendations:

```powershell
py scripts\check_round2_eval_coverage.py --strict
```

## Unseen External Smoke

Place external test images locally under:

```text
data/round2/unseen_external/
```

Then run:

```powershell
py scripts\run_unseen_external_smoke.py
```

This is prediction-only. It should not be reported as accuracy unless expected labels are independently reviewed.
