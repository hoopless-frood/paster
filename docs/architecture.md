# Architecture

How Paster's pieces fit together, why assets are kept separate from
geometry, and where to look when working on a given part of the pipeline.
For what the exported JSON itself means, see
[composition-format.md](./composition-format.md); for Figma-side layer
conventions, see [figma-guide.md](./figma-guide.md).

## The pipeline

```text
   Figma file
       │  (designer arranges layouts + items)
       ▼
┌──────────────┐
│  plugin/     │  Figma-side exporter (esbuild bundle, runs inside Figma)
│  @paster/    │  Scans the selection, converts Figma-specific geometry/
│  plugin      │  rotation/fills into the neutral schema, exports images.
└──────┬───────┘
       │  produces
       ▼
  composition.json  (+ images/*.png|.jpg|.svg, optionally zipped)
       │
       ▼
┌──────────────┐
│ packages/    │  Versioned schema + validation (framework-independent,
│ core/        │  no Figma or browser dependency). Every other package
│ @paster/core │  depends on this; nothing depends on Figma except plugin/.
└──────┬───────┘
       │  validated Composition
       ▼
┌──────────────┐
│ frontend/    │  Reusable renderer (React + CSS Modules, no Vite
│ react/       │  dependency, no bundler opinion). Turns a Composition
│ @paster/react│  into positioned, responsive DOM — content itself comes
└──────┬───────┘  from a consumer-supplied resolveContent function.
       │  used by
       ▼
┌──────────────┐
│ playground/  │  Reference consumer (Vite + @paster/core + @paster/react).
│ @paster/     │  Imports JSON or a ZIP, previews it live across viewport
│ playground   │  widths. Not required to use Paster — just the fastest
└──────────────┘  way to check an export, and this repo's own dev tool.
```

A real production consumer replaces the playground's role: it imports
`@paster/core` to validate, `@paster/react` to render, and supplies its
own `resolveContent` (backed by however it actually serves images —
a CMS, a CDN, static files, whatever). The playground is a demonstration
of that contract, not a dependency of it.

Because of that, the playground's rendered composition must stay
production-shaped: its `resolveContent`
(`playground/src/LayoutPanel/asset-content.tsx`) returns only the markup
a real consumer would, such as a bare `<img>`. Debug tooling (outlines,
item inspection) must never wrap or restyle that content. Wrapping it
changes the DOM and can visibly change rendering: a `<button>` around an
image, for example, paints its default background through the image's
transparent pixels. Debug UI belongs in a separate layer beside or on top
of the composition, in its own folder. For example,
`playground/src/ItemOutlines/` draws outlines by overlaying a second
`PasterComposition` rather than touching the preview's content.

## Package boundaries and responsibilities

| Package | Depends on | Owns | Never touches |
| --- | --- | --- | --- |
| `packages/core` (`@paster/core`) | nothing (workspace-internal) | Schema types, `validateComposition`, `selectLayout` (breakpoint selection), the sample composition | Figma's plugin API, the DOM, React |
| `plugin/` (`@paster/plugin`) | `@paster/core` | Reading Figma's live document (`figma.*`), converting Figma-specific concepts (rotation sign, node types, fills, image export) into the neutral schema, assembling the ZIP | Rendering anything — the plugin never shows a preview, only produces JSON/a ZIP |
| `frontend/react/` (`@paster/react`) | `@paster/core` | Turning a validated `Composition` into positioned, responsive DOM (`item-style.ts`'s geometry math, `Composition`/`Item` components) | Where content comes from (that's `resolveContent`, supplied by the consumer), any bundler-specific tooling |
| `playground/` (`@paster/playground`) | `@paster/core`, `@paster/react` | Import UI (paste/upload JSON or ZIP), viewport preview, its own `resolveContent` that resolves ZIP-imported images to blob URLs | Anything reusable by *other* consumers — playground-only concerns (its own CSS, its own ZIP-parsing) stay local to it |
| `tokens/` (`@paster/tokens`) | `style-dictionary` | Design token sources (`light.json`, `dark.json`) and `build.mjs`, which generates each consumer's `tokens.css` | Component-specific styles — those live with each consumer |

`tokens/light.json` is the complete default theme; `tokens/dark.json`
overrides only the values that differ and may reference shared palette
tokens (e.g. `{color.blossom}`). Rather than one global stylesheet, each
consumer generates its own gitignored `src/tokens.css` via
`buildTokens()` from `@paster/tokens`. The generated file contains the
light `:root` block plus the dark overrides, applied both on
`prefers-color-scheme: dark` (unless `data-theme="light"`) and on
`data-theme="dark"`, and sets `color-scheme` to match:

- The playground's `vite.config.ts` regenerates it on dev/build start and
  whenever a token file changes.
- `plugin/build.mjs` regenerates it on every build and inlines it into the
  UI HTML, since Figma's plugin UI is a single self-contained HTML string
  with no way to load an external stylesheet.

## Why assets are kept separate from geometry

A `Composition`'s `items` reference an image by `assetId`, never by
embedding image data directly. This is deliberate, not incidental:

- **The same physical asset is reusable across layouts.** A photo used in
  both a mobile and desktop arrangement is one `Asset` entry, referenced
  by an item in each layout — not duplicated data.
- **A layout can swap which asset an item points at.** The same item
  identity (`id`) can reference a *different* `assetId` per layout — a
  different rendered crop for a different breakpoint — without that being
  a different item.
- **Geometry-only export is a real, supported mode**, not a fallback.
  Someone who only needs positions/stacking (e.g. to hand-place their own
  already-hosted images) can export/import JSON with an empty `assets`
  array and nothing breaks — every item without a resolvable asset simply
  has no image to render (the playground shows a labeled placeholder box
  in that case).
- **A production consumer almost never wants Paster's own image
  hosting.** Keeping asset resolution as a consumer-supplied
  `resolveContent` function (rather than the schema embedding a fetchable
  URL) means a real site can map `assetId`/`Asset.path` to its own CDN,
  CMS, or asset pipeline, instead of being coupled to however Figma
  happened to export things.

## Where to look

| Working on… | Look at |
| --- | --- |
| Schema fields, validation rules | `packages/core/src/types.ts`, `validate.ts` |
| Breakpoint (layout) selection | `packages/core/src/breakpoints.ts` |
| Figma scanning, node type support, rotation sign conversion, image format auto-detection | `plugin/src/figma-export.ts` |
| ZIP assembly, path/naming collision handling | `plugin/src/assemble.ts` |
| Plugin ↔ UI thread messages | `plugin/src/protocol.ts` |
| Item positioning/rotation math (the layout-relative % + rotation-pivot correction) | `frontend/react/src/item-style.ts` |
| Composition-level rendering (background, clipping) | `frontend/react/src/Composition/Composition.tsx` |
| ZIP import, blob URL lifecycle | `playground/src/JsonPanel/import-zip.ts` |
| Shared color/font tokens, light/dark themes | `tokens/light.json`, `tokens/dark.json`, `tokens/build.mjs` |
