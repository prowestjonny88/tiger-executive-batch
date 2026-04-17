# Round 1 Dataset Contract

## Purpose
This document defines the frozen, backend-ready dataset package for OmniTriage Round 1.

## Package location
`data_package/round1/`

## Source-of-truth split
- `manifest.csv` = image-level interpretation and workflow truth
- `roi_annotations.csv` = ROI / coordinate truth
- `images/` = file-storage truth for the packaged image set
- `roi_ontology.csv` = ROI label role dictionary
- `roi_label_normalization.csv` = freeze-time normalization rules for legacy ROI labels
- `label_map.yaml` = mapping between dataset labels and internal product taxonomy

## Join key
The primary join key across package files is:

- `canonical_file_name`

Secondary technical keys:
- `coco_image_id` joins image-level rows to COCO-derived records
- `roi_id` / `coco_annotation_id` identify individual ROIs

## File purposes

### 1. `manifest.csv`
One row per image. This is the main backend-facing table for known cases.

Expected role:
- case-level metadata
- issue family / fault type
- hazard / resolver
- retrieval seed content
- guidance seed content

Required core columns:
- `canonical_file_name`
- `coco_image_id`
- `width`
- `height`
- `modality`
- `source_type`
- `view_type`
- `component_primary`
- `component_secondary`
- `visible_abnormalities`
- `visual_observation`
- `engineering_rationale`
- `fault_type`
- `issue_family`
- `hazard_level`
- `resolver_tier`
- `recommended_next_step`
- `required_proof_next`
- `replacement_likely`
- `manufacturer_verification_needed`
- `confidence_annotation`
- `approval_status`
- `group_id`
- `notes`

### 2. `roi_annotations.csv`
One row per ROI exported from COCO/CVAT.

Expected role:
- ROI display
- crop generation
- visual evidence localization
- retrieval/evidence highlighting support

Required core columns:
- `roi_id`
- `coco_annotation_id`
- `coco_image_id`
- `canonical_file_name`
- `category_id`
- `category_name`
- `bbox_x`
- `bbox_y`
- `bbox_w`
- `bbox_h`
- `segmentation_json`
- `iscrowd`

### 3. `images/`
Canonical packaged image set.
Every filename in `manifest.csv` must exist here.

### 4. `roi_ontology.csv`
Role dictionary for ROI labels.

Expected columns:
- `category_name`
- `label_role`
- `use_for_qa`
- `use_for_training`
- `notes`

Allowed `label_role` values:
- `component`
- `visible_abnormality`
- `ocr_region`
- `legacy_fault`

### 5. `roi_label_normalization.csv`
Small compatibility layer for freeze-time QA.

Expected role:
- explain how legacy ROI labels should be treated during QA
- avoid silently dropping old ROI categories

### 6. `label_map.yaml`
Mapping layer from dataset labels to internal product taxonomy.

Expected role:
- issue family defaults
- alternate issue families
- default hazard
- default resolver
- evidence type

## Legacy ROI labels
The following ROI labels are treated as `legacy_fault`:
- `faulty_isolator`
- `fuse_blow`

They are:
- kept for completeness and freeze-time QA
- not preferred as clean future ROI training labels
- interpreted at the image/case level instead of being expanded as the long-term ROI ontology

## Consistency rules
A valid package must satisfy all of the following:
1. every `canonical_file_name` in `manifest.csv` exists in `images/`
2. every `canonical_file_name` in `roi_annotations.csv` exists in `images/`
3. every `canonical_file_name` in `manifest.csv` appears in `roi_annotations.csv`
4. `manifest.csv` has one row per image
5. `roi_annotations.csv` may have multiple rows per image
6. no duplicate `canonical_file_name` rows in `manifest.csv`
7. no duplicate `roi_id` rows in `roi_annotations.csv`

## Row counts
Fill these after running final package sanity checks.

- image count:
- manifest row count:
- roi row count:

## Recommended backend integration order
1. load `manifest.csv`
2. load `roi_annotations.csv`
3. load `roi_ontology.csv`
4. load `label_map.yaml`
5. verify all packaged images exist in `images/`
6. build retrieval seed / known-case records

## Notes
This contract intentionally separates:
- ROI localization truth
- image-level interpretation truth
- file-storage truth

This is the stable boundary that future backend code should consume.
