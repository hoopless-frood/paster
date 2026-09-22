# Paster — implementation plan

Paster exports a Figma **Composition** (one selected parent frame) containing any number of named breakpoint **Layouts**. Each layout has a design-space size and positioned **Items**. It produces a versioned, portable JSON contract, optionally packaged with rendered images, and can be previewed by a framework-independent core + React renderer in a Vite playground.

**Workflow:** one milestone = one review checkpoint = one maintainer-made commit. Claude implements only the requested milestone, reports changes and checks, then stops without staging, committing, pushing, or advancing. Mark boxes complete only after review. Suggested commit messages are proposals, not commands.

## Decisions and invariants

- Monorepo: pnpm workspaces, TypeScript; CSS Modules for the React renderer and demo. Vite for demo, esbuild for plugin bundle; use a test runner such as Vitest where appropriate.
- Folders: `plugin/`, `packages/core/`, `frontend/react/`, `demo/`.
- Model: `Composition → Layout → Item`; `Item` is the public positioned-object term. In Figma, a Layout is a Frame node; an Item is not necessarily one. Keep Figma-specific node types at the adapter boundary.
- A selected parent Figma frame holds named layout frames; do not require exactly two layouts. Layout selection uses explicit, validated viewport minimum widths, including one base layout at 0; design-space width is not implicitly the CSS breakpoint.
- Coordinates and dimensions are relative to the layout frame. `zIndex` reflects each layout's Figma child stacking order, independently; the MVP accepts only visible, unrotated direct children of ordinary layout frames.
- Item identity links layouts to shared content; assets and content remain separate from layout geometry. Support per-layout asset overrides for differing rendered crops. A production consumer may supply its own asset mapping.
- Version exports (`version: 1`). Keep an explicit schema and validate all untrusted JSON before rendering. No automatic uploads, external image hosting, or Figma account authentication in the MVP.
- Geometry-only JSON export and composition-with-images ZIP export are separate modes. ZIP contains `composition.json` plus relative-path images. The demo resolves imported images locally and releases object URLs during cleanup.
- For MVP image fidelity, export **rendered** images per item (including Figma crop/visual treatment); do not mistake them for original production images. Preserve image aspect ratio, avoid accidental double cropping, and document the flattened-image trade-off.
- Use a README for people and `CLAUDE.md` for concise working conventions. Keep the public repository free of private assets, credentials, and client information. Choose a license explicitly before publishing.

## Milestones — one commit each

### M0 — Documentation and repository contract
- [x] Add `README.md` with purpose, workflow, architecture, current status, and public-development disclaimer.
- [x] Add `CLAUDE.md` and this `PLAN.md`; establish conventions, explicit non-goals, and license decision as a TODO if undecided.
- [x] Ensure documentation does not claim unfinished features exist.

**Accept:** docs agree on names, folder boundaries, asset model, and manual-commit workflow. No application code is required.  
**Suggested commit:** `docs: define Paster architecture and milestones`

### M1 — Workspace scaffold
- [x] Set up root pnpm workspace, scripts, TypeScript defaults, `.gitignore`, and minimal package manifests in the four agreed locations.
- [x] Configure Vite demo and esbuild plugin build, with package boundaries and shared-module imports working.
- [x] Add a minimal React demo shell; no fabricated working exporter or renderer.

**Accept:** clean install and relevant build/typecheck commands succeed; README shows exact commands.  
**Suggested commit:** `chore: scaffold Paster monorepo`

### M2 — Versioned core schema and validation
- [x] Define TypeScript types for composition, viewport rules, layouts, items, assets, and optional layout-specific asset references.
- [x] Specify a concrete JSON example and documented breakpoint selection rules, including one layout at min-width 0, unique thresholds, and deterministic ordering.
- [x] Validate positive container/item dimensions, finite geometry, unique IDs, safe asset paths, and references; explicitly decide whether layout item sets may differ (MVP: require matching IDs).
- [x] Add unit tests for valid/invalid data and breakpoint selection.
- [x] Add `docs/composition-format.md` as the canonical schema reference for anyone implementing another frontend renderer. Document the Composition → Layout → Item model, the versioned JSON schema, breakpoint selection, coordinate system, stacking order, asset references, and validation rules. Include a complete JSON example and state which fields are required vs. optional.

**Accept:** core is importable without Figma/React; tests pass; sample validates.  
**Suggested commit:** `feat(core): define and validate composition format`

### M3 — Figma geometry exporter
- [x] Create/register a local Figma Design plugin with an actual generated manifest ID (never invent one).
- [x] Read one selected parent frame; discover direct child frames as layouts and obtain breakpoint thresholds via an editable plugin UI field per layout, pre-filled with a suggestion computed from each layout's frame width (midpoint between neighboring widths; smallest layout suggests 0) — the exported value always comes from the field the user reviewed, never silently substituted.
- [x] Extract relative `x/y/width/height`, unique IDs, independent `zIndex` from back-to-front child order; skip hidden layers. Gracefully skip unsupported rotation/Auto Layout/complex nesting per-layer (with a clear warning) rather than blocking the whole export — only fail outright when nothing exportable remains.
- [x] Validate against core; expose a copyable geometry-only JSON export and actionable error messages.

**Accept:** moving/resizing/reordering Figma layers changes expected output; translating the parent frame doesn't change relative coordinates; multiple breakpoints work. Document hands-on checks if Figma cannot be run in the agent environment.  
**Suggested commit:** `feat(plugin): export validated frame geometry`

### M4 — React renderer
- [x] Render the versioned composition using `@paster/core` types and a consumer-supplied asset/content resolver.
- [x] Preserve composition aspect ratio, relative positions, viewport breakpoint choice, independent stacking, and layout-specific image overrides.
- [x] Use scoped CSS Modules and a local stacking context. Provide accessible image-content examples without inventing alt text.
- [x] Test geometry/breakpoints and document SSR and viewport behavior.

**Accept:** same data renders proportionally across widths, and layer order changes correctly at a breakpoint.  
**Suggested commit:** `feat(react): render responsive compositions`

### M5 — Playground with JSON import
- [x] Build a usable Vite playground with built-in sample data/assets, JSON paste/upload, validation errors, viewport-width control, and item outlines/IDs.
- [x] Show the active breakpoint and its design-space dimensions; keep preview consistent with actual renderer.
- [x] Provide accessible controls, keyboard interaction, and basic empty/loading/error states.

**Accept:** a fresh clone can preview sample data and valid imported JSON without Figma or a server.  
**Suggested commit:** `feat(demo): preview and inspect compositions`

### M6 — Figma image export and ZIP packaging
- [ ] Add export mode: geometry-only JSON or complete ZIP (`composition.json` and `images/`).
- [ ] Export rendered item images as PNG initially; name files deterministically and avoid collisions across layouts; support per-layout image references.
- [ ] Support SVG asset export alongside PNG and JPG.
- [ ] Preserve SVG assets in ZIP exports, using the same naming/path conventions as raster assets.
- [ ] Assemble/download ZIP in plugin UI; keep asset paths portable, relative, and validated. Report failures explicitly and handle large exports without silently creating incomplete packages.
- [ ] Add tests for package manifest/path conventions where possible.

**Accept:** a test composition produces a ZIP with valid JSON and the expected desktop/mobile (and extra layout) image assets.  
**Suggested commit:** `feat(plugin): package composition and image assets`

### M7 — ZIP import and end-to-end fidelity
- [ ] Import ZIP locally in the playground; validate archive entries, prevent path traversal/ambiguous duplicates, impose reasonable size limits, and resolve manifest paths.
- [ ] Create/revoke object URLs safely and show errors for missing/corrupt assets.
- [ ] Preserve SVG assets on ZIP import alongside raster assets.
- [ ] Safely handle SVG assets from imported compositions (validate/sanitize before rendering; never execute embedded scripts or external references).
- [ ] Verify exported imagery has no unintended second crop and matches relative geometry and stacking across breakpoints.
- [ ] Document complete Figma → ZIP → playground workflow; add automated tests and a manual visual QA checklist.

**Accept:** drag/drop a genuine export and reproduce all supported layouts without hand-entering image URLs.  
**Suggested commit:** `feat(demo): import complete Paster exports`

### M8 — Public-release hardening
- [ ] Add `docs/architecture.md`: explain how the monorepo fits together (Figma → Plugin → Composition JSON + assets → `@paster/core` → `@paster/react` → playground/consumer website). Cover package boundaries, responsibilities, and why assets are kept separate from geometry — keep this reasoning here rather than spreading it across code comments.
- [ ] Add `docs/figma-guide.md`: a practical guide for designers and developers, distinct from the README's quick start — detailed instructions and troubleshooting belong here. Cover the required layer hierarchy, matching item names, supported node types, image export formats, and how independent breakpoint layouts work. Document current limitations explicitly: nested groups, transforms, masks, Auto Layout, and any unsupported effects.
- [ ] Finalize license, contribution guidance, supported/unsupported Figma features, architecture and schema docs, examples, and screenshots with cleared rights.
- [ ] Run all tests, builds, typechecking and accessibility checks; address actual findings.
- [ ] Review repository contents for private/client files, credentials, and generated build artifacts; document plugin installation and known limitations.

**Accept:** a new developer can install, build, test, and run the complete pipeline using only public examples.  
**Suggested commit:** `docs: prepare Paster for public use`

## Backlog — not MVP commitments

Move items into GitHub Issues when ready to implement; link the issue here rather than duplicating detailed tracking.

### WordPress integration

- [ ] Create an installable plugin in `frontend/wordpress/`.
- [ ] Configure Gutenberg build tooling and local wp-env development.
- [ ] Implement a block with composition ZIP import and preview.
- [ ] Import assets into the WordPress Media Library.
- [ ] Support replacing assets with existing media attachments.
- [ ] Render compositions server-side using PHP and CSS.
- [ ] Validate composition data and asset references server-side.
- [ ] Test rendering parity against shared core fixtures.
- [ ] Package a self-contained WordPress plugin ZIP for releases.

### Figma structure and fidelity
- [ ] **Groups and nested compositions:** recursive node model, local coordinates, group opacity, clipping, and nested stacking contexts; define migration for schema v1.
- [ ] Mixed children: text, SVG, video, and arbitrary elements beyond images.
- [ ] Rotation, transforms, masks, constraints, and Auto Layout (including reverse stacking behavior).
- [ ] Support layout-specific visibility and non-identical item sets.
- [ ] Persistent item identity independent of layer names (e.g., Figma plugin data).
- [ ] Recover original image bytes, identify formats, deduplicate fills, translate crop modes/focal points, and assess production image quality.
- [ ] Animated GIF support: not covered by the planned PNG/JPG/SVG export — Figma's render API (`exportAsync`) can't produce an animated GIF, so this depends on recovering original uploaded image bytes (above) rather than re-rendering through Figma. Also implicates `prefers-reduced-motion` handling (see Motion and interaction) once animated content can appear.
- [ ] Support per-asset export format selection (choosing PNG/JPG/SVG per item rather than one format for the whole export).
- [ ] Investigate automatic vector/raster format detection (e.g., default vector-only items to SVG export).

### Motion and interaction
- [ ] **Motion for layers:** entrance/exit transitions, per-item timing/easing, stagger, depth/parallax, and breakpoint transitions. Define declarative data model only after prototyping.
- [ ] Honor `prefers-reduced-motion` with meaningful static equivalents.
- [ ] Interactive layers, pointer/focus behavior, and stacking for interactive controls.

### Authoring and integrations
- [ ] Direct manipulation and coordinate editing in playground; export edits as JSON.
- [ ] Compare imported composition with current version and preview a diff.
- [ ] CMS/asset-library adapter, image metadata/alt text workflow, and production URL mapping.
- [ ] Container-query mode alongside viewport breakpoint mode.
- [ ] Alternative renderers under `frontend/` (e.g., vanilla or Vue) when there is actual demand.
- [ ] GitHub Actions CI, releases, package publication, and optional Figma Community plugin publication.

## Tracking policy

Use this file for the roadmap and acceptance criteria. Use GitHub Issues for discrete actionable work (labels such as `plugin`, `core`, `react`, `demo`, `bug`, `enhancement`), milestones for releases, and a GitHub Project only if a board or cross-issue status view becomes useful. Record completed milestones here after maintainer review; do not make Claude close issues or push changes without being asked.
