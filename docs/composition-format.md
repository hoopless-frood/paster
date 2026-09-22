# Composition format

This is the canonical reference for Paster's exported JSON format. If you're
implementing a renderer against this data (in any language or framework), this
document — not the exporter or `@paster/core`'s internals — is the contract to
build against.

The format is defined and validated in [`@paster/core`](../packages/core)
(`packages/core/src/types.ts` and `validate.ts`), which has no Figma, React, or
browser dependencies.

## Model: Composition → Layout → Frame

- A **Composition** is one exported design: a set of breakpoint **Layouts**
  sharing a pool of **Assets**.
- A **Layout** is one breakpoint's arrangement: a design-space canvas
  (`width` × `height`) containing positioned **Frames**, active starting at a
  given viewport width (`minWidth`).
- A **Frame** is a single positioned object within a layout — coordinates,
  size, stacking order, and (optionally) which asset it renders. The same
  `id` in two different layouts means "this is the same piece of content,
  positioned/sized/stacked independently in each layout."

Assets and content are deliberately kept separate from layout geometry: a
`Frame` references an asset by `assetId` rather than embedding image data, so
the same physical asset can be reused across layouts, and each layout can
point a frame at a *different* asset (a different rendered crop) via its own
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
  width: number;    // design-space width of the layout frame
  height: number;   // design-space height of the layout frame
  frames: Frame[];
}

interface Frame {
  id: string;        // stable identity linking the same content across layouts
  name?: string;      // human-readable label (e.g. the Figma layer name); not identity
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;      // independent per-layout stacking order, 0 = furthest back
  assetId?: string;    // which asset this frame renders, if any
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
| `Layout`      | `id`, `name`, `minWidth`, `width`, `height`, `frames`     | —                    |
| `Frame`       | `id`, `x`, `y`, `width`, `height`, `zIndex`               | `name`, `assetId`   |
| `Asset`       | `id`, `path`, `width`, `height`                           | `alt`                |

## Coordinate system

`x`/`y`/`width`/`height` on a `Frame` are relative to its own layout's
origin (top-left of that layout's `width` × `height` canvas) — not to the
Figma page, not to the composition, and not to any other layout. Translating
the whole composition in Figma must not change any frame's exported
coordinates.

`x`/`y` may be negative or place a frame partially outside its layout's
bounds (Figma allows this); `width`/`height` must be positive.

## Stacking order

`zIndex` is independent per layout: a frame that's in front in one layout can
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
- `Layout.width`/`height` and `Frame.width`/`height` must be finite numbers
  greater than 0; `Frame.x`/`y` must be finite numbers (may be negative).
- `Frame.zIndex` must be a finite, non-negative integer, unique within its
  layout.
- Every layout must have identical frame `id` sets (MVP requires matching
  frame identity across all layouts — layout-specific visibility/frame sets
  are backlog, not supported yet).
- `Frame.id`, `Layout.id`, `Composition.id`, and `Asset.id` must each be
  unique within their scope.
- `Frame.assetId`, when present, must reference an existing `Asset.id`.
- `Asset.path` must be a safe, relative, portable path: no leading `/` or
  `\`, no `..` path segments, no URL scheme (`http://`, `file://`, etc.), and
  no Windows drive prefix.

`validateComposition` returns `{ valid: true, composition }` or
`{ valid: false, errors: string[] }` — it never throws, so callers (the
playground's import UI, in particular) can show every problem with the input
rather than just the first one.

## Complete example

```json
{
  "version": 1,
  "id": "homepage",
  "name": "Homepage",
  "assets": [
    { "id": "hero-image", "path": "images/hero.png", "width": 1600, "height": 900 },
    { "id": "portrait-image", "path": "images/portrait.png", "width": 800, "height": 1000 }
  ],
  "layouts": [
    {
      "id": "mobile",
      "name": "Mobile",
      "minWidth": 0,
      "width": 375,
      "height": 812,
      "frames": [
        { "id": "hero", "x": 0, "y": 0, "width": 375, "height": 240, "zIndex": 0, "assetId": "hero-image" },
        { "id": "portrait", "x": 24, "y": 260, "width": 327, "height": 400, "zIndex": 1, "assetId": "portrait-image" }
      ]
    },
    {
      "id": "desktop",
      "name": "Desktop",
      "minWidth": 1024,
      "width": 1440,
      "height": 900,
      "frames": [
        { "id": "portrait", "x": 80, "y": 80, "width": 480, "height": 600, "zIndex": 0, "assetId": "portrait-image" },
        { "id": "hero", "x": 600, "y": 0, "width": 840, "height": 900, "zIndex": 1, "assetId": "hero-image" }
      ]
    }
  ]
}
```

Note how `hero` and `portrait` appear in both layouts (matching frame
identity), but with different geometry *and* different relative stacking —
`hero` is behind `portrait` on mobile (`zIndex: 0` vs. `1`) and in front of it
on desktop. This exact composition is exported as `sampleComposition` from
`@paster/core` and used in its test suite.

## Non-goals (MVP)

This schema does not yet support (see [PLAN.md](../PLAN.md)'s backlog):
nested groups, rotation/transforms/masks, Auto Layout, layout-specific
visibility or non-identical frame sets, or non-image node types as frame
content (native vector shapes, live text, video). Note this is distinct from
*asset file format*: an `Asset.path` may point at a PNG, JPG, or (planned)
rendered SVG export of an image frame — the schema doesn't constrain format.
These are explicit scope boundaries, not omissions.
