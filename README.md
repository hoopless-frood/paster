# Paster

Paster is an open-source tool for translating art-directed Figma compositions into responsive web layouts.

It extracts item geometry and stacking order from Figma, eliminating manual coordinate entry while preserving independent compositions across breakpoints.

## Status

Paster is a new, public, work-in-progress project. The workspace installs, builds, and typechecks; `@paster/core` validates the composition schema; the Figma plugin can scan a selection and export validated, geometry-only composition JSON; and [`@paster/react`](./frontend/react) can render that composition responsively, given content you supply. **There is no image export or interactive playground yet** — the demo renders the sample composition with placeholder boxes, not real images or JSON import. Track real progress in [PLAN.md](./PLAN.md), which lists milestones and their acceptance criteria; only checked items are done.

## How it works

The following describes Paster's target workflow, once built:

1. **Compose:** Arrange your images in Figma, creating a layout for each breakpoint.
2. **Export:** Generate structured JSON or a ZIP containing the composition and its images.
3. **Preview:** Import the composition into the interactive playground to test responsive behavior.
4. **Implement:** Use the React renderer to reproduce the composition in your project.

Each layout scales proportionally between breakpoints while preserving its original arrangement.

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

The demo renders `@paster/core`'s sample composition with `@paster/react`, using placeholder boxes in place of real images — the "Preview" step below (an interactive playground with JSON import) isn't built yet, but "Export" and "Implement" are both real (see [Status](#status)).

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

Create a parent frame containing a frame for each responsive layout:

```text
paster
├── desktop
│   ├── hero
│   ├── portrait
│   └── detail
└── mobile
    ├── hero
    ├── portrait
    └── detail
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

There's no image export or ZIP packaging yet, so the exported JSON's `assets` array is always empty — but [`@paster/react`](./frontend/react) can render the geometry today, given content you supply yourself. There's no interactive playground to paste JSON into yet — see [PLAN.md](./PLAN.md) for what's next. [`docs/composition-format.md`](./docs/composition-format.md) documents what the exported JSON means.

## Project structure

```text
paster/
├── plugin/          # Figma exporter
├── packages/core/   # Schema, geometry, validation
├── frontend/react/  # React renderer
└── demo/            # Interactive playground
```

Paster uses pnpm workspaces, TypeScript, React, Vite, and CSS Modules. Its composition format is framework-independent, allowing additional renderers without changing the exporter.

## Development

Paster is under active, public development and not yet ready to use. See [PLAN.md](./PLAN.md) for implementation milestones, acceptance criteria, and planned features. Interfaces, schema versions, and the export format may change without notice until noted otherwise there.

## License

Paster is licensed under the [Apache License 2.0](./LICENSE).

Created by Anna Pearson.