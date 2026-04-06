# Design System Document: The Precision Standard

## 1. Overview & Creative North Star
**Creative North Star: The Technical Conservator**

This design system moves away from the "disposable" feel of modern tech startups and toward the permanence of high-end industrial engineering. For an EV troubleshooting application, the UI must act as a calm, authoritative expert. We achieve this through **The Technical Conservator** aesthetic: a philosophy that prioritizes high-clarity editorial layouts, intentional white space, and a rejection of traditional "app-like" borders in favor of sophisticated tonal layering.

By utilizing asymmetric compositions and a rigid adherence to typographic hierarchy, we transform a utility tool into a premium service experience. The goal is to make the user feel like they are looking at a digital version of a luxury vehicle’s technical manual—reliable, high-contrast, and impeccably organized.

---

## 2. Colors: Tonal Architecture
We move beyond flat colors to create a sense of environmental depth. The palette is anchored by the signature green, used with surgical precision to denote safety and "Go" states.

### Palette Strategy
- **Primary (`#006e28` / `#27b24d`):** Use these strictly for "Action" and "Success." They are the beacons of the UI.
- **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Structural boundaries must be defined solely by the shift from `surface` (`#f9f9ff`) to `surface-container-low` (`#f0f3ff`) or `surface-container` (`#e7eefe`).
- **Surface Hierarchy & Nesting:** Treat the interface as a series of stacked, precision-cut plates.
    - **Base:** `surface`
    - **Content Sections:** `surface-container-low`
    - **Interactive Cards:** `surface-container-lowest` (pure white) to create a subtle "lift."
- **The Glass & Gradient Rule:** For floating status bars or navigation overlays, use a semi-transparent `surface` color with a 20px backdrop-blur. Apply a subtle linear gradient to main CTAs (from `primary` to `primary_container`) to provide a tactile, "illuminated" quality to the buttons.

---

## 3. Typography: The Editorial Voice
We utilize a dual-font strategy to balance industrial character with technical legibility.

- **Display & Headlines (Manrope):** Chosen for its geometric stability. Large scales (`display-lg` at 3.5rem) should be used with tight letter-spacing (-0.02em) to create an authoritative, editorial header feel.
- **Body & Labels (Inter):** The workhorse. Inter’s tall x-height ensures that technical data and troubleshooting steps remain legible even in low-light environments (common for EV charging).
- **The Hierarchy Rule:** Every screen must have a clear typographic "Hero." Use `headline-lg` to state the problem clearly, and `body-md` for the solution. Avoid middle-ground sizes; lean into high contrast between headers and body text to guide the eye.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "digital." We use **Ambient Depth** to imply structure.

- **The Layering Principle:** Depth is achieved by placing `surface-container-lowest` (#ffffff) elements on top of `surface-container-low` (#f0f3ff) backgrounds. This creates a "soft lift" that feels architectural rather than "computed."
- **Ambient Shadows:** For critical floating elements (e.g., a "Safety Stop" button), use a multi-layered shadow:
    - *Shadow:* `0px 4px 20px rgba(21, 28, 39, 0.06)`
    - This tinted shadow (using the `on_surface` color) mimics natural light better than generic grey.
- **The Ghost Border Fallback:** If a boundary is required for accessibility (e.g., input fields), use `outline_variant` at **15% opacity**. It should be felt, not seen.
- **Glassmorphism:** Use for persistent status overlays. A container using `surface` at 80% opacity with a `backdrop-filter: blur(12px)` keeps the user grounded in their current context.

---

## 5. Components: Precision Primitives

### Buttons
- **Primary:** High-gloss. Background: `primary`. Text: `on_primary`. Shape: `md` (0.375rem). No border.
- **Secondary:** Tonal. Background: `secondary_container`. Text: `on_secondary_container`.
- **Tertiary:** Text-only with an underline on hover. Use for "Learn More" or "Technical Specs."

### Cards & Lists
- **The Rule of No Dividers:** Horizontal lines are forbidden. Use 24px or 32px of vertical white space from the spacing scale to separate list items.
- **Troubleshooting Cards:** Use `surface-container-lowest` with a 4px left-accent border of `primary` to indicate "Active" or "Healthy" status.

### Input Fields
- **States:** Background should be `surface_container_low`. On focus, shift to `surface_container_lowest` and apply a 1px `primary` ghost border (20% opacity).
- **Typography:** Labels must use `label-md` in `on_surface_variant` for a muted, professional look.

### Charging Progress Indicator
- A bespoke component using a thick (8px) track of `surface_container_highest` and a high-contrast `primary` fill. No rounded caps; use square ends for a more technical, "metered" appearance.

---

## 6. Do's and Don'ts

### Do
- **Do** lean into asymmetry. Align text to the left but allow large imagery or data visualizations to bleed off the right edge.
- **Do** use `primary_fixed` for subtle highlights in tables.
- **Do** treat "Safety Information" with high-contrast `error` (#ba1a1a) tokens, but keep the typography at `title-sm` to avoid "shouting" at the user.

### Don't
- **Don't** use pure black (#000000) for long-form text. Use `on_surface` (#151c27) to reduce eye strain.
- **Don't** use standard "Material Design" shadows. If it looks like a default component, it has failed the premium requirement.
- **Don't** use icons without labels. In a safety-critical troubleshooting app, clarity is the highest form of luxury.
- **Don't** use "hypey" language. Instead of "Magically fixing your charger," use "Recalibrating power delivery modules."

---

## 7. Signature Interaction: The "Steady State"
All transitions must use a `cubic-bezier(0.2, 0.8, 0.2, 1)` timing function. This creates a "weighted" feel—elements don't just pop in; they glide into place with a sense of momentum and stability, mirroring the heavy-duty nature of EV hardware.