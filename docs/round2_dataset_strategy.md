# Round 2 Dataset Strategy

The live prototype is built for the organizer-scoped ESUM Theme 2 guide.

## Source Of Truth

- Organizer rule semantics live in `data/round2/theme2_rules.json`.
- Text/demo scenarios live in `data/demo/scenarios.json`.
- Raw Dataset 2 media stays outside Git.

## Raw Data Policy

Do not commit full raw image or video folders. `.gitignore` excludes:

- `data/raw/`
- `data/datasets/`
- `data/round2/raw/`
- `data/round2/images/`
- common video extensions

Small curated samples may be added later under `data/round2/sample_images/`.

## Future Manifest Shape

When Drive access is available, generate `data/round2/manifest.csv` with:

- `drive_file_id`
- `drive_url`
- `file_name`
- `mime_type`
- `folder_path`
- `input_component_weak`
- `observation_weak`
- `expected_fault_type_v2`
- `expected_recipient_type`
- `review_status`
- `notes`

Folder labels are weak labels only. The live prototype should still rely on VLM/heuristic perception plus deterministic organizer rules.
