# Figma guide

A practical guide to structuring a Figma file for Paster, and to what the
plugin does and doesn't support. The README's [Prepare your
composition](../README.md#prepare-your-composition) section is the quick
start; this is the detailed reference — troubleshooting, the full list of
supported layer types, and current limitations. For what the *exported
JSON* means, see [composition-format.md](./composition-format.md).

## Layer hierarchy

```text
paster                    ← the composition: select this frame to export
├── desktop                 ← a layout (one breakpoint)
│   ├── image-a             ← an item
│   ├── image-b
│   └── image-c
└── mobile                  ← another layout
    ├── image-a             ← same name = same item, positioned independently
    ├── image-b
    └── image-c
```

- The **composition** is one Figma frame containing one child frame per
  breakpoint. Select this parent frame, not a layout or an item, before
  running the plugin.
- Each **layout** is a direct child frame of the composition. Its own
  width/height become the layout's design-space dimensions; its direct
  children become items.
- Each **item** is a direct child of a layout frame. An item's `name` (the
  Figma layer name) is its identity — give the same visual content the
  *same layer name* in every layout it appears in, so the plugin knows
  they're the same item positioned differently per breakpoint. A name only
  needs to be unique *within* its own layout; the same name naturally
  recurs across layouts (that's the point).
- Layouts and items just need to be **visible, direct children** — a layout
  nested inside another frame, or an item nested inside a group, won't be
  found. See [Groups](#groups-and-nesting) below for the common way this
  bites people.

## Supported item layer types

An item can be any of: **Frame, Component, Instance, Rectangle, Ellipse,
Vector, Text, Line, Star, Polygon, Boolean Operation**. Anything else
(Group, Slice, Section, Sticky, Connector, Widget, …) is skipped with a
warning rather than blocking the rest of the export.

### Groups and nesting

**Groups are not supported as items or as layouts.** If a layer is a Group,
ungroup it (`Shift+Ctrl+G` / `Shift+Cmd+G`) or flatten it into a single
layer, then re-run the scan. The plugin's warning for this
(`a group isn't supported yet (ungroup or flatten it)`) tells you exactly
which layer needs it.

Nested groups, and content nested more than one level inside a layout
(e.g. an item inside a frame inside a frame), aren't read at all — only
direct children of a layout frame become items. If you need visual
grouping for organization in Figma, flatten it before exporting; each
piece of visible content should be a single, direct child of its layout.

## Breakpoints and layout order

Every layout frame you select becomes a breakpoint. There's no limit to
two — add as many layouts as you have distinct arrangements. The plugin
suggests a starting min-width for each, based on frame width (the
narrowest layout suggests 0; every other layout suggests the midpoint
between its own width and the next-narrower layout's) — always review and
adjust these, especially if your frames aren't ordered narrow-to-wide by
width. The suggestion is just a starting point: whatever's in the field
when you click Export is what ships, never silently substituted.

Exactly one layout must end up at min-width 0 (the base/mobile-first
layout) — the plugin will tell you if none, or more than one, ends up
there.

## Rotation

An item's own rotation is fully supported and exported as-is — rotate a
layer in Figma exactly as you would normally, and the exported item
carries that angle, matching what Figma's own rotation field shows you (a
positive value tilts clockwise, same as Figma's UI and ordinary CSS).

What's *not* supported is rotating a **layout** frame or the **composition**
frame itself — a rotated layout is skipped entirely with a warning; a
rotated composition frame just prints a "hasn't been tested" warning and
proceeds (double-check the geometry if you see this).

A heavily rotated item (close to 90°/180°) can visually extend past its
own layout's edges even when correctly positioned — that's expected
geometry, not a bug. Whether it's clipped there depends on
[Clip content](#clip-content-and-bleed) below.

## Clip content and bleed

A layout frame's own **Clip content** setting (Figma's frame property,
sometimes shown as "Clip") is read and carried through: if it's on (the
default for a new frame), content that extends past the layout's edges —
a deliberately bleeding photo, or a rotated item whose corners swing
outside its own box — is clipped there, matching what you'd see rendered
in Figma. If it's off, that content renders unclipped in the playground
too. Toggle it in Figma if the exported preview doesn't match what you
expect to see.

## Layout background color

If a layout frame has a plain **solid** fill, that color is extracted and
exported as the layout's background. A gradient, image, or mixed/multiple
fill has no single CSS color to report, so it's omitted rather than
guessed at — the layout renders with no background color set in that case
(transparent, showing whatever's behind it).

## Image export formats

When exporting a ZIP, each item's format is chosen automatically — you
don't pick one format for the whole export:

- A layer that's inherently a vector shape (Vector, Boolean Operation,
  Star, Polygon, Line) always exports as **SVG**, preserving its
  scalability.
- A layer with a **plain fill** (solid color, gradient, or no fill at all)
  and no image also exports as **SVG** — it's still flat vector content,
  regardless of node type (a Rectangle or Frame with just a color fill
  exports as SVG, not a raster image).
- A layer with an actual **photo/image fill** rasterizes, using whichever
  raster format (PNG or JPG) you picked in the export panel — *unless*
  that image needs transparency (it's PNG-sourced, or its source can't be
  read), in which case it's exported as PNG regardless of your choice,
  rather than risk silently flattening a transparent image to an opaque
  JPG.
- **Text** always rasterizes to PNG (never JPG, so the area around the
  glyphs stays transparent), regardless of your raster preference.

If an exported photo looks like it lost transparency it shouldn't have,
or a flat-color shape came out as a raster image instead of a crisp SVG,
that's the one case worth reporting — everything above should make that
impossible by construction.

## Large compositions

A single export supports up to 300 items across all its layouts combined.
Past that, image export is refused outright (with a clear error) rather
than silently producing a slow, partial ZIP — use geometry-only JSON
export instead, or split into fewer layouts/items.

## Troubleshooting: common warnings

Warnings don't block export — the rest of the composition still exports
around the flagged layer. Fix what you want and click **Refresh
selection** to re-scan without losing your other settings.

| Warning | What it means |
| --- | --- |
| `a group isn't supported yet (ungroup or flatten it)` | See [Groups and nesting](#groups-and-nesting). |
| `a <type> isn't supported yet` | The layer's node type isn't in the supported list above — recreate it as one that is (often: rasterize it as an image, or redraw as a shape). |
| `duplicate layer name within this layout` | Two items in the *same* layout share a name — item identity is scoped per layout, so give each a unique name within its own layout. |
| `duplicate layout name` | Two layout (breakpoint) frames share a name at the composition's top level — rename one. |
| `Auto Layout isn't supported yet` (on a layout) | That layout frame has Auto Layout enabled — turn it off (or convert to a plain frame) for that specific frame. |
| `rotation isn't supported yet` (on a layout) | That layout *frame itself* is rotated — items inside it can still be rotated; only the frame can't be. |
| `is rotated` / `uses Auto Layout` (on the composition, "hasn't been tested") | The top-level composition frame itself has rotation or Auto Layout — export proceeds, but double-check the resulting geometry carefully. |
| `no visible, supported child layers` | A layout frame has nothing exportable inside it (everything's hidden, or nothing is a supported type) — it's dropped entirely. |

Only a genuinely unusable selection — nothing selected, the wrong node
type selected, or every layout ending up empty — blocks export outright;
everything else above degrades gracefully.

## Current limitations

Not yet supported, tracked as backlog work (see [PLAN.md](../PLAN.md)):

- **Groups**, nested compositions, and anything more than one level deep
  inside a layout.
- **Transforms other than rotation** — skew, non-uniform scale, and
  Figma's corner/edge constraints.
- **Masks** and clipping paths (beyond a layout frame's own Clip content
  toggle).
- **Auto Layout**, on a layout frame (blocked) or the composition frame
  (untested, proceeds with a warning).
- **Layout-specific item visibility** — every visible item in a layout is
  exported; there's no way to include an item in one layout's arrangement
  but omit it from another's while keeping the same identity.
- **Effects that paint outside a layer's own box**, such as a drop
  shadow or an outside stroke, are cut off at the layer's edges in its
  exported image, which covers exactly the layer's own width × height.
  To keep one, put the layer inside a frame big enough to contain the
  effect, and use that frame as the item.
- Recovering **original, full-resolution image bytes** — exported images
  are Figma's own rendered crop/scale of each item, not the source file,
  so very large source photos are re-encoded down to what's actually
  shown.
