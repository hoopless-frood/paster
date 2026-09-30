# Paster playground

A Vite + React app for previewing Paster compositions: load JSON or a ZIP export from the Figma plugin, and see how it renders at any width. It's a reference consumer of [`@paster/core`](../packages/core) and [`@paster/react`](../frontend/react), and this repository's own dev tool. A hosted copy runs at [paster.annapearson.dev](https://paster.annapearson.dev/).

For how to *use* it, see [Preview](../README.md#preview) in the main README. This file is for working on it.

## Running it

From the repository root, build the packages once (the playground imports their built output), then start the dev server:

```bash
pnpm run build
pnpm run dev        # http://localhost:5173
```

From this folder:

```bash
pnpm run dev        # Vite dev server
pnpm run build      # builds @paster/core and @paster/react, then the app into dist/
pnpm run preview    # serves the built dist/ locally
pnpm run test       # Vitest
pnpm run typecheck
```

The build is a static site with two pages, `dist/index.html` (the playground) and `dist/about/index.html` (the About page), so it can be hosted anywhere static files can.

## How it's organized

```text
playground/
├── index.html              # playground page
├── about/index.html        # About page (a separate page, so /about/ works on any static host)
├── vite.config.ts          # both pages, plus generating src/tokens.css from tokens/
└── src/
    ├── main.tsx, about.tsx # entry points for the two pages
    ├── App/                # the playground: JSON and Layout tabs
    ├── About/              # the About page
    ├── global.css          # page-wide styles; tokens.css is generated, not committed
    ├── breakpoints.css     # named breakpoints (@custom-media), resolved by Lightning CSS at build time
    └── components/         # one folder per component: .tsx, .types.ts, .module.css, tests
```

A few places worth knowing:

- **`components/JsonPanel/`** handles importing: `import-composition.ts` (parse and validate JSON), `import-zip.ts` (read a ZIP export safely), and `session.ts` (keep the composition across page loads in a tab).
- **`components/LayoutPanel/`** is the preview. `asset-content.tsx` is its `resolveContent`, the part a real site would write itself.
- **The collage example** is imported straight from [`examples/collage/`](../examples/collage), and Vite bundles it into the build.

## Two rules it follows

- **The preview matches production markup.** The rendered composition is exactly what a real site would render with `@paster/react`: a bare `<img>` per item, with no wrappers or debug styling. Debug tools belong in a separate layer on top. [docs/architecture.md](../docs/architecture.md) explains why.
- **Nothing leaves the browser.** Imports are parsed locally, and the only storage is the browser's own (`sessionStorage` and IndexedDB), so a composition survives visiting the About page or reloading.
