# Paster Figma plugin

Exports a Figma composition, one frame per breakpoint, as Paster composition JSON, or as a ZIP with every item's image. For how to set up a Figma file and use the plugin, see the [Figma guide](../docs/figma-guide.md); for what the output means, see the [composition format](../docs/composition-format.md). This file is for working on the plugin.

## Running it

From the repository root:

```bash
pnpm install
pnpm run build:plugin   # builds @paster/core and the plugin into plugin/dist/
pnpm run dev:plugin     # rebuilds on change (run a full build once first)
```

Then, in the Figma desktop app, choose **Plugins → Development → Import new plugin from manifest** and select `plugin/manifest.json`. You only import it once; after a rebuild, just run the plugin again.

From this folder, `pnpm run test` runs the unit tests and `pnpm run typecheck` checks both halves of the plugin.

## How it's put together

A Figma plugin runs in two places that can only talk through messages: a **main thread** with access to the Figma document but no DOM, and a **UI iframe** with a DOM but no document access.

| File | Runs in | Does |
| --- | --- | --- |
| `src/code.ts` | main thread | Entry point: handles Refresh and Export ZIP requests, replies to the UI |
| `src/figma-export.ts` | main thread | Reads the selection into layouts and items, picks each image's format, exports images |
| `src/assemble.ts` | main thread | Builds and validates the composition, derives breakpoint min-widths, names image files |
| `src/protocol.ts` | both | The message types passed between the two |
| `src/ui.ts`, `ui.html`, `ui.css` | UI iframe | The panel: status, warnings, Copy JSON, and assembling and downloading the ZIP |
| `src/json-view.ts` | UI iframe | The read-only, syntax-highlighted JSON view (CodeMirror) |

Figma loads the UI as a single HTML string, with no server to fetch other files from. So [`build.mjs`](./build.mjs) bundles the UI script, the generated theme tokens and `ui.css`, inlines them all into `dist/ui.html`, and embeds that HTML in `dist/code.js`. The manifest allows no network access.

## Figma behaviors it works around

- **Exported images come out as they look on the canvas.** `exportAsync` renders a rotated layer already rotated, and crops anything hanging past a clipping frame. The schema needs each item's own unrotated box, so the plugin exports a temporary copy instead: moved onto the page, unrotated, at its full bounds, then deleted.
- **Rotation runs the other way.** Figma counts counterclockwise as positive, both in the API and in its Rotation field; CSS counts clockwise. The plugin negates it once, at export.
- **Format is chosen per item.** Vector content exports as SVG. Anything with a photo or text, including inside a frame or group, exports as PNG, never JPG, since PNG keeps transparency and a CMS can re-encode later.
- **The clipboard API is blocked** in the plugin iframe, so Copy JSON uses a temporary textarea and `execCommand("copy")` from the click itself.
- **Figma nodes can't be sent to the UI.** Images are exported on the main thread and passed across as bytes; the ZIP is built in the UI, which is the side with `Blob` and downloads.

Known limits: one export handles up to 300 items, and effects that paint outside a layer's box (such as a drop shadow) are cut off at its edges. The [Figma guide](../docs/figma-guide.md#current-limitations) lists the rest.
