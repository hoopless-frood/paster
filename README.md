# Paster

Paster is an open-source tool for translating art-directed Figma compositions into responsive web layouts.

It extracts frame geometry and stacking order from Figma, eliminating manual coordinate entry while preserving independent compositions across breakpoints.

## Status

Paster is a new, public, work-in-progress project. The workspace now installs, builds, and typechecks, and the demo runs a placeholder shell — but **there is no working Figma exporter, schema validation, renderer, or playground content yet**. The Figma workflow and playground sections below describe the intended design, not current functionality. Track real progress in [PLAN.md](./PLAN.md), which lists milestones and their acceptance criteria; only checked items are done.

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

The demo currently renders only a placeholder shell. The rest of this section — the Figma plugin workflow — describes the intended design; it isn't functional yet (see [Status](#status)).

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

`plugin/manifest.json` is currently an empty placeholder. Figma generates the real file (including the plugin's `id`) the first time you use **Plugins → Development → New Plugin...** in the desktop app — that step, and wiring the generated manifest to this build's `plugin/dist/code.js` and `plugin/dist/ui.html`, is planned for a later milestone (see [PLAN.md](./PLAN.md)); the plugin can't be imported into Figma until then.

### Prepare your composition

Create a parent frame containing a frame for each responsive layout:

```text
Homepage
├── Desktop
│   ├── hero
│   ├── portrait
│   └── detail
└── Mobile
    ├── hero
    ├── portrait
    └── detail
```

- The parent frame represents the composition.
- Each layout frame defines its own dimensions and coordinate system.
- Image frames are direct children of their layout.
- Matching layer names identify the same content across layouts.
- Position, size, and stacking order can differ between breakpoints.

### Export and preview

Select the parent composition frame and run **Plugins → Development → Paster**.

Export the composition as JSON or include rendered images in a ZIP. Import the result into the playground to inspect the layout at different viewport sizes.

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