# Paster — WordPress Integration Plan

## Goal

Create an installable WordPress plugin that allows editors to import, preview, and publish responsive Paster compositions through a Gutenberg block.

The plugin consumes Paster's existing composition format without introducing WordPress-specific fields into `@paster/core`.

**Primary workflow:**

1. Add a Paster block in Gutenberg.
2. Import a composition JSON or ZIP.
3. Associate assets with the WordPress Media Library.
4. Preview layouts and configure image accessibility.
5. Publish a responsive composition rendered with PHP and CSS.

The public frontend should not require React hydration or JavaScript for basic layout rendering.

## Architecture

```text
paster/
├── plugin/                  # Figma exporter
├── packages/core/           # Portable composition format
├── frontend/
│   ├── react/               # Existing React renderer
│   └── wordpress/           # WordPress plugin
│       ├── src/
│       ├── includes/
│       ├── tests/
│       ├── build/           # Generated
│       ├── paster.php
│       ├── .wp-env.json
│       ├── package.json
│       └── PLAN.md
└── demo/                    # Existing Vite playground
```

The WordPress implementation owns Gutenberg integration, Media Library references, server-side rendering, and PHP validation.

### Architectural rules

- Preserve the portable `Composition → Layout → Frame` model.
- Do not introduce WordPress dependencies into `@paster/core`.
- Reuse `@paster/react` for editor previews where practical.
- Render published compositions server-side with PHP and CSS.
- Do not duplicate composition data unnecessarily.
- Store WordPress attachment references separately from Paster's asset identifiers.
- Support the existing versioned schema and arbitrary configured breakpoints.
- Use the existing asset format and validation rules rather than inventing a separate WordPress schema.
- Keep the plugin independently installable without requiring the monorepo or Node.js in production.

**Build tooling:** pnpm, TypeScript, CSS Modules for editor components, WordPress block packages, and wp-env.

Use the WordPress build system unless existing tooling offers a demonstrably simpler approach.

---

# Milestones

Each milestone represents one review checkpoint and one maintainer-made commit.

Claude must stop after completing the requested milestone. Do not stage, commit, push, or proceed automatically.

## W0 — WordPress workspace scaffold

- [ ] Create `frontend/wordpress/`.
- [ ] Add its `package.json` to the existing pnpm workspace.
- [ ] Configure WordPress block build tooling.
- [ ] Configure a local WordPress environment using wp-env.
- [ ] Create the main `paster.php` plugin entry point.
- [ ] Register a minimal Gutenberg block using `block.json`.
- [ ] Add root-level development commands.
- [ ] Ignore generated files and local WordPress environment data.

Expose these root commands:

```bash
pnpm wp:start
pnpm wp:stop
pnpm dev:wordpress
pnpm build:wordpress
```

Use the existing root script conventions and avoid overwriting unrelated scripts.

**Acceptance criteria**

The plugin installs and activates in local WordPress. A Paster block appears in the block inserter. Production and development builds succeed.

Document any manual verification that could not be completed.

**Suggested commit:** `chore(wordpress): scaffold Gutenberg plugin`

---

## W1 — Block data model and validation

Define how a Gutenberg block stores a Paster composition.

- [ ] Register a dynamic block with appropriate attributes.
- [ ] Store the composition's versioned JSON data.
- [ ] Define a separate mapping between asset IDs and WordPress attachment IDs.
- [ ] Establish a schema for image metadata and alternative text.
- [ ] Implement PHP validation for the composition format.
- [ ] Validate breakpoint values, geometry, stacking order, and asset references.
- [ ] Reject unsupported schema versions with a useful error.

Do not assume that validation performed in JavaScript is sufficient for PHP rendering.

Decide and document whether the composition is stored directly in block attributes or through a dedicated persistence mechanism. Prefer block attributes initially unless size or performance testing demonstrates a need for something more complex.

**Acceptance criteria**

A valid composition can be saved and retrieved through block attributes. Invalid input cannot produce unsafe or malformed frontend output.

**Suggested commit:** `feat(wordpress): define block data and validation`

---

## W2 — Server-side renderer

Implement the public frontend using PHP and CSS.

- [ ] Render the composition through a dynamic block.
- [ ] Generate semantic HTML for positioned frames.
- [ ] Preserve proportional scaling and layout aspect ratios.
- [ ] Support data-driven breakpoints.
- [ ] Preserve independent geometry and z-index per layout.
- [ ] Support layout-specific asset overrides.
- [ ] Resolve WordPress attachments to image URLs.
- [ ] Use WordPress image APIs where appropriate.
- [ ] Ensure separate Paster blocks cannot interfere with each other's styling.
- [ ] Avoid requiring frontend JavaScript for static compositions.

Use CSS custom properties for geometry where appropriate.

Generate or register breakpoint CSS safely, using validated numeric thresholds and composition-specific selectors.

Ensure breakpoint behavior matches the React renderer.

**Acceptance criteria**

A composition renders correctly on the public page at different viewport widths.

Multiple Paster blocks work independently on the same page, including blocks with different breakpoint configurations.

No unnecessary frontend React runtime is loaded.

**Suggested commit:** `feat(wordpress): add server-side composition renderer`

---

## W3 — Gutenberg editor and preview

Create the block editing experience.

- [ ] Build the editing interface with TypeScript and React.
- [ ] Reuse `@paster/react` for composition previews where practical.
- [ ] Display an appropriate empty state.
- [ ] Show the active composition and available layouts.
- [ ] Provide a responsive preview-width control.
- [ ] Display validation errors.
- [ ] Use standard Gutenberg controls where appropriate.
- [ ] Support keyboard navigation and accessible status messages.

Do not introduce an entirely separate rendering engine for the editor.

Keep the initial interface focused on importing, previewing, and configuring compositions rather than direct manipulation of geometry.

**Acceptance criteria**

Editors can preview a saved composition and inspect its responsive behavior without leaving Gutenberg.

The editor handles invalid or missing data gracefully.

**Suggested commit:** `feat(wordpress): add Gutenberg composition preview`

---

## W4 — Composition JSON import

Implement the simplest import path first.

- [ ] Add a JSON file import control.
- [ ] Parse and validate the composition using `@paster/core`.
- [ ] Reject unsupported versions and invalid references.
- [ ] Display useful import errors.
- [ ] Allow the editor to confirm before replacing an existing composition.
- [ ] Save the imported data to block attributes.
- [ ] Preserve asset identifiers for later Media Library association.

Do not upload assets or contact external services during JSON import.

**Acceptance criteria**

An editor can import a valid Paster JSON file, preview it, save the post, and reload the editor without losing the composition.

Malformed JSON does not destroy existing block data.

**Suggested commit:** `feat(wordpress): import composition JSON`

---

## W5 — ZIP import and Media Library integration

Implement the complete Figma-to-WordPress asset workflow.

- [ ] Accept Paster ZIP exports.
- [ ] Validate archive structure and file paths.
- [ ] Enforce reasonable archive size and extraction limits.
- [ ] Reject path traversal and duplicate archive entries.
- [ ] Read and validate `composition.json`.
- [ ] Identify referenced image assets.
- [ ] Upload supported images to the WordPress Media Library.
- [ ] Store attachment IDs in the WordPress asset mapping.
- [ ] Preserve layout-specific image overrides.
- [ ] Display import progress and actionable errors.
- [ ] Handle partial upload failures without silently saving an incomplete composition.

Supported raster formats should follow Paster's existing export contract.

**SVG security:** Do not enable arbitrary SVG uploads merely to support Paster ZIPs. Use an explicitly validated and sanitized SVG import pathway before accepting SVG assets. Until that pathway is implemented, reject SVG imports with a clear explanation.

Asset upload operations must check permissions and use WordPress's supported media APIs.

**Acceptance criteria**

An editor can import a genuine Paster ZIP and obtain a working composition with Media Library attachments.

An invalid or incomplete ZIP does not silently overwrite existing block data.

**Suggested commit:** `feat(wordpress): import composition assets`

---

## W6 — Asset management and accessibility

Allow editors to manage image content independently of the layout.

- [ ] List assets referenced by the composition.
- [ ] Display their associated Media Library attachments.
- [ ] Allow replacing an asset with an existing attachment.
- [ ] Preserve frame geometry when an asset changes.
- [ ] Support independent desktop/mobile asset references.
- [ ] Provide an alternative-text workflow.
- [ ] Distinguish informative and decorative images.
- [ ] Use appropriate WordPress image attributes and responsive image handling.
- [ ] Avoid inventing alt text from Figma layer names.
- [ ] Preserve accessibility metadata when reimporting geometry.

Consider duplicated images across breakpoints when determining alternative text and accessibility semantics. Avoid unnecessarily repeating identical content to assistive technologies.

**Acceptance criteria**

Editors can replace images without changing the composition.

Published images have appropriate accessibility handling.

**Suggested commit:** `feat(wordpress): add asset management and accessibility`

---

## W7 — Testing, documentation, and distribution

Prepare an independently installable WordPress plugin.

- [ ] Add shared fixtures for React/PHP rendering comparisons.
- [ ] Test breakpoints, geometry, stacking, and asset overrides.
- [ ] Test malformed compositions and unsafe asset references.
- [ ] Test multiple blocks on one page.
- [ ] Test invalid ZIPs, unsupported SVGs, and partial import failures.
- [ ] Run build, typechecking, PHP linting, and applicable automated tests.
- [ ] Complete manual editor and frontend accessibility checks.
- [ ] Document local development and installation.
- [ ] Document supported WordPress/PHP versions.
- [ ] Build a distributable plugin ZIP.
- [ ] Exclude development dependencies, source maps where unnecessary, temporary files, credentials, and local environment data.
- [ ] Verify the release ZIP installs in a clean WordPress environment.

Document any untested functionality explicitly.

**Acceptance criteria**

A developer can clone the monorepo and run the WordPress demo.

A WordPress user can install the release ZIP without pnpm, Node.js, or the source repository.

A real exported composition works from import through publication.

**Suggested commit:** `chore(wordpress): prepare plugin release`

---

# Backlog

These are not requirements for the initial WordPress integration.

## Editing and authoring

- [ ] Directly manipulate frame positions in Gutenberg.
- [ ] Edit geometry numerically.
- [ ] Reimport geometry without replacing asset associations.
- [ ] Compare an existing composition with a new import.
- [ ] Preview differences before applying updates.
- [ ] Support reusable compositions across multiple posts.
- [ ] Consider a dedicated composition custom post type if reuse warrants it.

## Visual capabilities

- [ ] Nested Figma groups and compositions.
- [ ] Layer motion and transitions.
- [ ] Reduced-motion alternatives.
- [ ] Interactive layers.
- [ ] Video assets.
- [ ] Advanced SVG support and sanitization.
- [ ] Crop and focal-point editing.
- [ ] Container-query layout selection.

## WordPress integration

- [ ] Block patterns and reusable examples.
- [ ] Global composition library.
- [ ] WordPress REST API integration for external publishing.
- [ ] Advanced Media Library synchronization.
- [ ] Multisite compatibility.
- [ ] Internationalization and localization.
- [ ] WordPress.org Plugin Directory publication.

---

# Working agreement

Follow the root `CLAUDE.md` and this plan.

Before starting a milestone:

1. Inspect the existing repository and relevant Paster packages.
2. Confirm that required dependencies and earlier milestones exist.
3. Identify any architectural conflicts before editing.

After completing a milestone, report:

- Files changed.
- Implementation details and significant decisions.
- Commands executed and their results.
- Tests and manual checks completed.
- Known limitations or blockers.
- Suggested conventional-commit message.

Update checkboxes only for verified work.

**Stop for manual review and commit. Never automatically advance to the next milestone.**