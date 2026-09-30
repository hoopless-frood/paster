# @paster/react

A reusable React renderer for [Paster](../../README.md) composition JSON.
Framework-independent beyond React itself — it doesn't depend on Vite or any
particular build tool. See [`docs/composition-format.md`](../../docs/composition-format.md)
for what the composition data means.

## Usage

`PasterComposition` handles layout only — geometry, breakpoint selection,
and stacking (via an internal `PasterItem` per positioned item). It never
renders content itself; you supply a `resolveContent` function that decides
what appears inside each item.

```tsx
import { PasterComposition, type ItemContentResolver } from "@paster/react";
import type { Composition } from "@paster/core";

declare const composition: Composition;

const resolveContent: ItemContentResolver = (item, { asset }) => {
  if (!asset) {
    return null;
  }

  return (
    <img
      src={resolveAssetUrl(asset)} // however your app maps an Asset to a URL
      alt={altTextByItemId[item.id] ?? ""}
      width={asset.width}
      height={asset.height}
      // Fill the item's box exactly. Exported images already match it, so
      // never crop with object-fit: cover (see docs/composition-format.md).
      style={{ display: "block", width: "100%", height: "100%", objectFit: "fill" }}
    />
  );
};

<PasterComposition composition={composition} resolveContent={resolveContent} />;
```

## Accessible image content — don't invent alt text

`resolveContent` receives the item's resolved `Asset` (via `item.assetId`),
which may carry an optional `asset.alt` — but that field is exporter/consumer
metadata, not something Paster verified or generated. **Never assume it's
suitable alt text on its own.** Maintain your own explicit mapping from item
identity to accessible alt text (as in the example above,
`altTextByItemId[item.id]`), and treat `asset.alt` as, at best, a fallback
you've reviewed — never a silent default. If an item is purely decorative,
render it with `alt=""` explicitly, not by omitting `alt`.

## Breakpoint selection and viewport tracking

The active layout is chosen via `@paster/core`'s `selectLayout` — mobile-first,
the layout with the largest `minWidth` not exceeding the current viewport
width.

- **Uncontrolled (default):** omit `viewportWidth` and the component tracks
  `window.innerWidth` reactively, updating on resize.
- **Controlled:** pass `viewportWidth` explicitly to pin rendering to a known
  width — for SSR determinism, tests, or a fixed-size embed. The window is
  never touched in this mode.

## SSR behavior

`PasterComposition` renders safely with no `window` global (e.g. under
`react-dom/server`). Without an explicit `viewportWidth`, the very first
render — server-side, and the client's first paint before hydration — always
uses width `0`, which resolves to the composition's required base layout
(`minWidth: 0`). After mount, an uncontrolled component switches to the real
`window.innerWidth` and re-renders with the matching layout.

This means an uncontrolled composition server-rendered above the base
layout's breakpoint will visibly swap layouts immediately after hydration —
expected, not a bug. If that flash is undesirable, pass `viewportWidth`
explicitly (e.g., from a server-side viewport hint) to render the correct
layout deterministically from the start.

## Development

```bash
pnpm --filter @paster/react run build
pnpm --filter @paster/react run typecheck
pnpm --filter @paster/react run test
```
