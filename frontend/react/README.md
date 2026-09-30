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
      // Every layout is in the page; lazy images in hidden layouts don't load.
      loading="lazy"
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

## Breakpoint selection

Layouts are chosen by CSS, not JavaScript. `PasterComposition` renders every
layout and makes itself a size container (`container-type: inline-size`); a
small generated `<style>` then shows the layout with the largest `minWidth`
that doesn't exceed **the composition's own width**, using `@container`
rules. Only those breakpoint numbers are generated; the rest of the styling
is in the component's CSS module.

That means:

- **It follows the space the composition is given**, not the window. In a
  700px column on a wide screen, or with padding around it, the composition
  shows the layout designed for 700px. At full page width, the two are the
  same.
- **It works on the server and without JavaScript.** Server-rendered HTML
  already contains every layout and the rules that choose between them, so
  the right layout shows from the first paint, with no swap after hydration.
- **Hidden layouts are still in the page.** Render images with
  `loading="lazy"`, as above, so a layout's images only download once it's
  shown.

Browser support: container queries work in Chrome and Edge 105+, Safari
16+, and Firefox 110+.

If your site uses a Content Security Policy, the generated `<style>` element
needs `style-src` to allow inline styles (a nonce or `'unsafe-inline'`), as
the inline `style` attributes that position each item already do.

## Development

```bash
pnpm --filter @paster/react run build
pnpm --filter @paster/react run typecheck
pnpm --filter @paster/react run test
```
