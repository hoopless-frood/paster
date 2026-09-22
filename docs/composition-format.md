# Composition format

This is the canonical reference for Paster's exported JSON format. If you're
implementing a renderer against this data (in any language or framework), this
document — not the exporter or `@paster/core`'s internals — is the contract to
build against.

The format is defined and validated in [`@paster/core`](../packages/core)
(`packages/core/src/types.ts` and `validate.ts`), which has no Figma, React, or
browser dependencies.

## Model: Composition → Layout → Item

- A **Composition** is one exported design: a set of breakpoint **Layouts**
  sharing a pool of **Assets**.
- A **Layout** is one breakpoint's arrangement: a design-space canvas
  (`width` × `height`) containing positioned **Items**, active starting at a
  given viewport width (`minWidth`). In Figma, a Layout corresponds to an
  actual Figma Frame node.
- An **Item** is a single positioned object within a layout — coordinates,
  size, stacking order, and (optionally) which asset it renders. Unlike a
  Layout, an Item isn't necessarily a Figma Frame node — it's whatever visual
  content (currently an image or SVG) sits inside one. The same `id` in two
  different layouts means "this is the same piece of content,
  positioned/sized/stacked independently in each layout."

Assets and content are deliberately kept separate from layout geometry: an
`Item` references an asset by `assetId` rather than embedding image data, so
the same physical asset can be reused across layouts, and each layout can
point an item at a *different* asset (a different rendered crop) via its own
`assetId` — geometry, stacking, and asset selection are all independent
per layout.

## Schema version

```ts
export const COMPOSITION_SCHEMA_VERSION = 1;
```

Every composition has a top-level `version` field. Consumers must reject any
version they don't explicitly support rather than guessing at compatibility.
There is currently one version: `1`.

## Types

```ts
interface Composition {
  version: 1;
  id: string;
  name: string;
  layouts: Layout[];
  assets: Asset[];
}

interface Layout {
  id: string;
  name: string;
  minWidth: number; // viewport width (CSS px) this layout activates at
  width: number;    // design-space width of the layout
  height: number;   // design-space height of the layout
  backgroundColor?: string; // CSS color from the layout frame's own Figma fill
  items: Item[];
}

interface Item {
  id: string;        // stable identity linking the same content across layouts
  name?: string;      // human-readable label (e.g. the Figma layer name); not identity
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;      // independent per-layout stacking order, 0 = furthest back
  assetId?: string;    // which asset this item renders, if any
}

interface Asset {
  id: string;
  path: string;   // relative, portable path (within a ZIP export, or resolved by the consumer)
  width: number;
  height: number;
  alt?: string;   // never auto-derived from Figma metadata — explicit only
}
```

### Required vs. optional fields

| Type          | Required fields                                        | Optional fields    |
| ------------- | -------------------------------------------------------- | ------------------- |
| `Composition` | `version`, `id`, `name`, `layouts`, `assets`             | —                    |
| `Layout`      | `id`, `name`, `minWidth`, `width`, `height`, `items`      | `backgroundColor`    |
| `Item`        | `id`, `x`, `y`, `width`, `height`, `zIndex`               | `name`, `assetId`   |
| `Asset`       | `id`, `path`, `width`, `height`                           | `alt`                |

## Coordinate system

`x`/`y`/`width`/`height` on an `Item` are relative to its own layout's
origin (top-left of that layout's `width` × `height` canvas) — not to the
Figma page, not to the composition, and not to any other layout. Translating
the whole composition in Figma must not change any item's exported
coordinates.

`x`/`y` may be negative or place an item partially outside its layout's
bounds (Figma allows this); `width`/`height` must be positive.

## Stacking order

`zIndex` is independent per layout: an item that's in front in one layout can
be behind in another. Within a single layout, `zIndex` values must be unique,
non-negative integers (in practice, `0..n-1` reflecting Figma's back-to-front
child order at export time).

## Breakpoint selection

Layout selection is mobile-first, like a CSS `min-width` media query: given a
viewport width, the active layout is the one with the **largest `minWidth`
that does not exceed the viewport width**. This is deterministic regardless
of the order layouts appear in the `layouts` array.

```ts
function selectLayout(composition: Composition, viewportWidth: number): Layout;
```

A composition's design-space `width` is **not** implicitly its CSS
breakpoint — `minWidth` is the only field that determines when a layout
activates.

## Validation rules

`validateComposition(input: unknown)` enforces, in addition to the required
fields above:

- `version` must equal `COMPOSITION_SCHEMA_VERSION` (currently `1`).
- Exactly one layout must have `minWidth: 0` (a base layout); every other
  `minWidth` must be a unique, non-negative number.
- `Layout.width`/`height` and `Item.width`/`height` must be finite numbers
  greater than 0; `Item.x`/`y` must be finite numbers (may be negative).
- `Item.zIndex` must be a finite, non-negative integer, unique within its
  layout.
- `Item.id`, `Layout.id`, `Composition.id`, and `Asset.id` must each be
  unique within their scope.
- `Item.assetId`, when present, must reference an existing `Asset.id`.
- `Asset.path` must be a safe, relative, portable path: no leading `/` or
  `\`, no `..` path segments, no URL scheme (`http://`, `file://`, etc.), and
  no Windows drive prefix.

Layouts don't need identical item `id` sets — a layout can have more or
fewer items than another. An id that *is* shared across layouts is still
treated as the same item everywhere, so mismatched sets produce a
non-blocking warning rather than an error, in case it wasn't intentional.

`validateComposition` returns `{ valid: true, composition, warnings: string[] }`
or `{ valid: false, errors: string[] }` — it never throws, so callers (the
playground's import UI, in particular) can show every problem with the input
rather than just the first one.

## Complete example

```json
{
  "version": 1,
  "id": "asymmetric-grid",
  "name": "Asymmetric Grid",
  "assets": [
    { "id": "image-a-asset", "path": "images/image-a.png", "width": 1600, "height": 1100 },
    { "id": "image-b-asset", "path": "images/image-b.png", "width": 1200, "height": 900 },
    { "id": "image-c-asset", "path": "images/image-c.png", "width": 1000, "height": 700 }
  ],
  "layouts": [
    {
      "id": "mobile",
      "name": "Mobile",
      "minWidth": 0,
      "width": 375,
      "height": 812,
      "backgroundColor": "#f5f1ea",
      "items": [
        { "id": "image-a", "x": 20, "y": 40, "width": 335, "height": 280, "zIndex": 1, "assetId": "image-a-asset" },
        { "id": "image-b", "x": 110, "y": 360, "width": 245, "height": 200, "zIndex": 0, "assetId": "image-b-asset" },
        { "id": "image-c", "x": 20, "y": 610, "width": 180, "height": 150, "zIndex": 2, "assetId": "image-c-asset" }
      ]
    },
    {
      "id": "desktop",
      "name": "Desktop",
      "minWidth": 1024,
      "width": 1440,
      "height": 900,
      "backgroundColor": "#eae6e0",
      "items": [
        { "id": "image-a", "x": 80, "y": 80, "width": 680, "height": 500, "zIndex": 0, "assetId": "image-a-asset" },
        { "id": "image-b", "x": 860, "y": 200, "width": 500, "height": 340, "zIndex": 1, "assetId": "image-b-asset" },
        { "id": "image-c", "x": 200, "y": 660, "width": 420, "height": 180, "zIndex": 2, "assetId": "image-c-asset" }
      ]
    }
  ]
}
```

Note how `image-a`, `image-b`, and `image-c` all appear in both layouts
(matching item identity) with an asymmetric arrangement and generous negative
space between them — not a grid of equal cells — but with different geometry
*and* different relative stacking per layout: `image-b` is behind `image-a`
on mobile (`zIndex: 0` vs. `1`) and in front of it on desktop. This exact
composition is exported as `sampleComposition` from
`@paster/core` and used in its test suite.

## ZIP packaging

The Figma plugin's **Export ZIP** mode packages a complete, portable export:

```text
export.zip
├── composition.json
└── images/
    ├── mobile-image-a.png
    ├── desktop-image-a.png
    └── ...
```

- `composition.json` sits at the archive root and is exactly the JSON
  described above.
- Every `Asset.path` is a path *within the ZIP*, relative to its root (e.g.
  `images/mobile-image-a.png`) — the same field used for a standalone,
  images-supplied-separately JSON export.
- One image is exported per (layout, item) pair, even when the same item id
  is visually identical across layouts, so each layout can point at a
  different rendered crop via its own `assetId`.
- PNG, JPG, and SVG are all supported; the plugin's naming/collision rules
  (deterministic, slugified `<layout>-<item>` stems, de-duplicated with a
  numeric suffix) keep paths portable and unambiguous.

### Importing a ZIP

The demo playground's **Upload .zip export** parses the archive entirely in
the browser (via [JSZip](https://stuk.github.io/jszip/), no upload to a
server):

1. `composition.json` is extracted and validated exactly like pasted JSON.
2. For each `Asset` the validated composition references, the matching ZIP
   entry is extracted and turned into an in-memory `blob:` URL.
3. Only entries the composition actually references are ever read — since
   `Asset.path` is already required to be a safe, traversal-free relative
   path (see [Validation rules](#validation-rules) above) before it's used
   to look up an archive entry, an unreferenced or maliciously-named entry
   elsewhere in the ZIP is never extracted at all.
4. Every asset format, including SVG, is rendered as an `<img src>` rather
   than inserted as inline markup — a browser never executes scripts or
   fetches external references from an SVG used as an image source, so this
   holds regardless of what an untrusted export's SVG might contain.
5. A missing referenced asset, an oversized upload, or a corrupt archive all
   surface as explicit errors rather than a partial or silently-broken
   import.

Re-importing a JSON-only export, or hand-editing the JSON after a ZIP
import, doesn't discard the images already loaded from that ZIP — only a
*new* ZIP import replaces them (revoking the previous `blob:` URLs).

### Manual QA checklist (Figma → ZIP → playground)

Automated tests cover `importZip` against synthetic archives; the following
needs a real Figma file and a real plugin export, and isn't automated:

- [ ] Export a composition with at least two layouts as a ZIP; every layout's
      images appear correctly when the playground's viewport slider crosses
      into that layout.
- [ ] Each item's image matches the source Figma layer exactly — no
      unintended second crop, letterboxing, or stretch — at both a layout's
      native size and other viewport widths.
- [ ] Stacking order in the playground matches Figma's front-to-back order,
      independently per layout.
- [ ] An item that shares an id across layouts, but points at a *different*
      `assetId` per layout, shows the right image for the active layout.
- [ ] Export includes at least one SVG asset; it renders correctly and (open
      devtools) never appears as an inline `<svg>` in the DOM, only an
      `<img>`.
- [ ] Uploading a ZIP that's missing a referenced image, isn't a ZIP at all,
      or contains a corrupted `composition.json` each produce a clear error,
      not a blank preview or a console exception.
- [ ] Uploading a second ZIP after a first replaces its images cleanly (no
      leftover images from the first one bleeding through).

## Non-goals (MVP)

This schema does not yet support (see [PLAN.md](../PLAN.md)'s backlog):
nested groups, rotation/transforms/masks, Auto Layout, layout-specific
visibility or non-identical item sets, or non-image node types as item
content (native vector shapes, live text, video). Note this is distinct from
*asset file format*: an `Asset.path` may point at a PNG, JPG, or (planned)
rendered SVG export of an image item — the schema doesn't constrain format.
These are explicit scope boundaries, not omissions.
