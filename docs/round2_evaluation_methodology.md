# Round 2 Evaluation Methodology

This project uses two evaluation modes for Theme 2 validation.

## Weak-Label Sanity

Run:

```powershell
python scripts\evaluate_round2_cases.py --mode weak-label-sanity
```

This mode includes the expected component, observation, and relative path in the incident hint. It is useful for checking that the manifest, weak labels, Theme 2 fallback, and deterministic rule mapping are wired correctly.

Weak-label sanity metrics are not visual accuracy. They can be inflated because fallback heuristics can read the expected labels from the hint.

## Blind Image Eval

Run:

```powershell
python scripts\evaluate_round2_cases.py --mode blind-image-eval
```

This mode uses a neutral hint:

```text
Photo uploaded for EV charger troubleshooting.
```

It does not include expected labels, folder category labels, fault type, or recipient. This is the closest local proxy for judging with unseen images.

With Gemini enabled:

```powershell
$env:GEMINI_API_KEY="your_key"
python scripts\gemini_smoke_test.py
python scripts\evaluate_round2_cases.py --mode blind-image-eval
```

## Manual Review Cases

`data/round2/manual_review_cases.json` contains quarantined cases that were not clean enough for the baseline evaluation pack. Reviewers should fill the structured `manual_*` fields and set:

```text
manual_review_status = reviewed_include_eval
```

Then promote reviewed cases:

```powershell
python scripts\promote_manual_review_to_eval.py
```

By default this writes `data/round2/evaluation_cases.reviewed.json` and does not overwrite the main evaluation file.

## Serial And Brand Ground Truth

Do not invent serial or brand/model values from VLM guesses. Only set `serial_number_expected` and `brand_model_expected` after human review. Once those fields are present, the evaluator reports exact-match OCR metrics instead of `n/a`.

Until those reviewed fields exist, the runtime may still extract visible serial or brand/model values for live charger-label evidence, but report metrics must describe exact OCR validation as partial.

## Current Coverage Guardrail

The clean baseline is intentionally conservative. Run:

```powershell
python scripts\check_round2_eval_coverage.py
```

Warnings for EVDB single-phase, missing/wrong specs, isolator ON/OFF, or exact OCR ground truth mean the runtime can still support those cases, but the committed evaluation pack does not yet prove them with reviewed image ground truth.

## Interpreting Metrics

- Use weak-label sanity for pipeline regression checks.
- Use blind image eval with Gemini enabled for visual extraction confidence.
- Treat fallback-only blind results as conservative behavior checks, not proof of VLM performance.
- Keep low-confidence, conflict, and video cases quarantined until manually reviewed or converted into extracted frame cases.
