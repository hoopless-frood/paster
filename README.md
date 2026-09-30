# Paster

Paster turns art-directed Figma compositions into responsive web layouts.

A designer arranges a collage of images in Figma once per breakpoint. Paster exports each arrangement's positions, sizes, stacking order and rotation, so the web version keeps every breakpoint's composition exactly as designed, with no hand-entered coordinates.

**Try it:** [paster.annapearson.dev](https://paster.annapearson.dev/) runs the playground in your browser, with example compositions ready to load.

<img width="1149" height="567" alt="A collage composition in Figma, with the Paster plugin open beside it" src="https://github.com/user-attachments/assets/3b714c6e-c295-426d-aa30-04e2cc54c089" />

## What works today

- **Figma plugin:** exports a composition as JSON, or as a ZIP with every item's rendered image (PNG or SVG).
- **`@paster/core`:** the versioned composition format, with validation and breakpoint selection.
- **[`@paster/react`](./frontend/react):** renders a composition responsively, with images supplied by your site.
- **Playground:** load an example, or upload your own JSON or ZIP export, and preview it at any viewport width.

[PLAN.md](./PLAN.md) lists what's next, as milestones with acceptance criteria; only checked items are done.

## How it works

1. **Compose:** Arrange your images in Figma, creating a layout for each breakpoint.
2. **Export:** Generate structured JSON, either alone or packaged as a ZIP with real exported images.
3. **Preview:** Import the composition (or ZIP) into the interactive playground to test responsive behavior.
4. **Implement:** Use the React renderer to reproduce the composition in your project.

Each layout scales proportionally between breakpoints while preserving its original arrangement. All four steps work today.

## Getting started

You'll need [Node.js](https://nodejs.org/) 22 or later and [pnpm](https://pnpm.io/) (the repository pins its version; `corepack enable` sets it up). Running the Figma plugin also needs the Figma desktop app.

```bash
pnpm install
pnpm run build   # build every package, in dependency order
pnpm run dev     # start the playground at http://localhost:5173
```

### Workspace commands

`build` compiles `packages/core` and `frontend/react` before the plugin and playground, since both depend on them:

```bash
pnpm run build        # build every package, in dependency order
pnpm run test         # run every package's tests
pnpm run typecheck    # typecheck every package (run after build, so cross-package types resolve)
pnpm run dev          # start the playground's Vite dev server (run `build` at least once first)
pnpm run build:plugin # build just the plugin and the packages it depends on
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
- Items (frames, groups, shapes, vectors, text — see [the Figma guide](./docs/figma-guide.md) for the full list) are direct children of their layout. A group or frame item is exported as one image of everything in it.
- Matching layer names identify the same content across layouts.
- Position, size, stacking order, and rotation can differ between breakpoints.

[`docs/figma-guide.md`](./docs/figma-guide.md) covers this in full — supported layer types, breakpoints, rotation, clipping, image export formats, and troubleshooting for every warning the plugin can show.

### Export

1. Select the parent composition frame and run **Plugins → Development → Paster**. The plugin scans the selection and shows the generated composition JSON.
2. Click **Copy JSON** to copy the JSON shown to your clipboard, or **Export ZIP** to download it plus every item's rendered image (PNG or SVG). After selecting a different frame or changing layers, click **Refresh** to update the JSON; **Export ZIP** always re-reads the selection itself.

Each layout's breakpoint min-width is set automatically from frame widths (see [the Figma guide](./docs/figma-guide.md#breakpoints-and-layout-order)); adjust it afterwards in the JSON or your CMS.

An item's own rotation is preserved. Individual layers the plugin doesn't support yet (Auto Layout, duplicate names, or a rotated *layout* frame) don't block the export — they're skipped and listed as warnings alongside the result, so the rest of the composition still exports. Only an unusable selection (nothing selected, something other than a frame, or no layout with any supported layers) blocks export outright; fix that in Figma and click **Refresh**. Layer names that don't match across layouts are allowed, with a warning in case it wasn't intentional.

Paste the JSON, or upload the ZIP, in the playground to preview it, or use [`@paster/react`](./frontend/react) directly, given content you supply yourself. [`docs/composition-format.md`](./docs/composition-format.md) documents what the exported JSON means and how a ZIP export is packaged.

### Preview

A hosted copy of the playground is live at [paster.annapearson.dev](https://paster.annapearson.dev/) — no local setup needed to try it.

To run it yourself, run `pnpm run dev` and open http://localhost:5173. [`examples/`](./examples) has ready-made files to try: a real exported collage, and a small geometry example. The playground loads either with its **Load collage example** and **Load geometry example** buttons, and starts with the geometry example — paste or upload your own composition JSON, or upload a complete ZIP export (e.g. from the plugin's **Export ZIP** button), to preview it instead. Invalid JSON, a corrupt/incomplete ZIP, a file over the size limits (5 MB for JSON, 50 MB for a ZIP), or a composition that fails schema validation shows every problem found, without losing your last valid preview.

- **Viewport width** — drag the slider (or use arrow keys) to see which layout is active at a given width, up to desktop widths even on a phone (a preview wider than your screen is scaled down to fit); the active layout's name is shown next to the width.

An item without a real image (uploaded via JSON alone, without a matching ZIP) renders as a labeled placeholder box instead.

Your JSON, the images from any ZIP you imported, the active tab, and your light/dark choice are kept for the current browser tab, so opening the About page or reloading doesn't lose them. Nothing leaves your browser: the JSON is cleared when the tab closes, and the most recent uploaded ZIP is kept until you upload another.

The **?** in the header opens an About page (`/about/`) with a short overview of Paster for people arriving at the playground.

## Project structure

```text
paster/
├── plugin/          # Figma exporter
├── packages/core/   # Schema, geometry, validation
├── frontend/react/  # React renderer
├── playground/      # Interactive playground
├── examples/        # Ready-made compositions and a Figma source file
├── tokens/          # Shared design tokens (colors, fonts, light/dark)
└── docs/            # Architecture, composition format, Figma guide
```

See [`docs/architecture.md`](./docs/architecture.md) for how these fit together, each package's responsibilities, and why assets are kept separate from geometry.

Paster uses pnpm workspaces, TypeScript, React, Vite, and CSS Modules. Its composition format is framework-independent, allowing additional renderers without changing the exporter.

## License

[Apache License 2.0](./LICENSE).

