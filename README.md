# Paster

Paster is an open-source tool for translating art-directed Figma compositions into responsive web layouts.

It extracts item geometry and stacking order from Figma, eliminating manual coordinate entry while preserving independent compositions across breakpoints.

## Status

Paster is a new, public, work-in-progress project. The workspace installs, builds, and typechecks; `@paster/core` validates the composition schema; the Figma plugin can scan a selection and export validated, geometry-only composition JSON; [`@paster/react`](./frontend/react) can render that composition responsively, given content you supply; and the demo is a working playground — paste or upload composition JSON, adjust a viewport-width control, and preview it live. **There is no image export yet** — every item still renders as a labeled placeholder box, since the exported JSON's `assets` array is always empty until Figma image export lands. Track real progress in [PLAN.md](./PLAN.md), which lists milestones and their acceptance criteria; only checked items are done.

## How it works

1. **Compose:** Arrange your images in Figma, creating a layout for each breakpoint.
2. **Export:** Generate structured JSON — a ZIP with real exported images is planned but not built yet (see [Status](#status)).
3. **Preview:** Import the composition into the interactive playground to test responsive behavior.
4. **Implement:** Use the React renderer to reproduce the composition in your project.

Each layout scales proportionally between breakpoints while preserving its original arrangement. Steps 1, 3, and 4 are fully working today; step 2 produces real, validated geometry JSON, just without image bytes yet.

## Getting started

Clone the repository and install dependencies:

```bash
pnpm install
```

### Workspace commands

These work today — `build` compiles `packages/core` and `frontend/react` before the plugin and demo, since both depend on them:

```bash
pnpm run build       # build every package, in dependency order
pnpm run typecheck   # typecheck every package (run after build, so cross-package types resolve)
pnpm run dev          # start the demo's Vite dev server (run `build` at least once first)
pnpm run build:plugin # build just the plugin and its @paster/core dependency
pnpm run dev:plugin   # rebuild the plugin on change (run `build` at least once first)
```

`pnpm run dev` opens the playground described in [Preview](#preview) below.

### Build the plugin

```bash
pnpm run build:plugin
```

The build generates the files Figma needs in `plugin/dist/`. These files are not committed to the repository.

### Install in Figma

Using the Figma desktop app:

1. Open a Figma Design file.
2. Navigate to **Plugins → Development → Import new plugin from manifest**.
3. Select `plugin/manifest.json` from your local repository.

You only need to import the manifest once. After making code changes, rebuild and rerun the plugin.

### Prepare your composition

Paster is meant for a single art-directed composition — an asymmetric grid of
images with intentional negative space, not a page of conventional sections
like a hero banner. Create a parent frame containing a frame for each
responsive layout:

```text
paster
├── desktop
│   ├── image-a
│   ├── image-b
│   └── image-c
└── mobile
    ├── image-a
    ├── image-b
    └── image-c
```

- The parent frame represents the composition.
- Each layout frame defines its own dimensions and coordinate system.
- Items (currently images or SVGs) are direct children of their layout.
- Matching layer names identify the same content across layouts.
- Position, size, and stacking order can differ between breakpoints.

### Export

1. Select the parent composition frame and run **Plugins → Development → Paster**. The plugin scans the selection and lists each layout it found.
2. Each layout's breakpoint minimum width (px) is pre-filled with a suggestion based on its frame width — the smallest layout suggests 0, and each other layout suggests the midpoint between its width and the next-smaller layout's. Review and edit these before exporting; the exported value is always whatever's in the field, never silently substituted.
3. Click **Export JSON**. The validated composition JSON appears in the text box, ready to copy.

Individual layers the plugin doesn't support yet (rotation, Auto Layout, groups, duplicate names) don't block the export — they're skipped and listed as warnings alongside the result, so the rest of the composition still exports. Only a genuinely unusable selection (nothing selected, the wrong node type, or mismatched layer names across layouts that leave the schema invalid) blocks export outright; fix that in Figma and click **Refresh selection** to re-scan.

There's no image export or ZIP packaging yet, so the exported JSON's `assets` array is always empty. Paste the copied JSON straight into the demo playground (`pnpm run dev`) to preview it, or use [`@paster/react`](./frontend/react) directly, given content you supply yourself — see [PLAN.md](./PLAN.md) for what's next. [`docs/composition-format.md`](./docs/composition-format.md) documents what the exported JSON means.

### Preview

A hosted copy of the demo is live at [paster.annapearson.dev](https://paster.annapearson.dev/) — no local setup needed to try it.

To run it yourself, run `pnpm run dev` and open the demo in a browser. It starts with a built-in sample composition — paste or upload your own composition JSON (e.g. copied from the plugin's **Export JSON** step) to preview it instead. Invalid JSON or a composition that fails schema validation shows every problem found, without losing your last valid preview.

- **Viewport width** — drag the slider (or use arrow keys) to see which layout is active at a given width; the exact breakpoint and design-space dimensions are shown alongside the preview.
- **Show item outlines and IDs** — overlay each item's bounds and identity, useful for checking geometry against the source Figma file.

Since there's no image export yet, every item renders as a labeled placeholder box rather than a real image.

## Project structure

```text
paster/
├── plugin/          # Figma exporter
├── packages/core/   # Schema, geometry, validation
├── frontend/react/  # React renderer
└── demo/            # Interactive playground
```

Paster uses pnpm workspaces, TypeScript, React, Vite, and CSS Modules. Its composition format is framework-independent, allowing additional renderers without changing the exporter.
