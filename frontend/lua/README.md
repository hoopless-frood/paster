# Paster LÖVE renderer (experimental)

A proof of concept that draws a Paster composition in a native [LÖVE](https://love2d.org) window. It reads the same JSON as [`@paster/react`](../react) and needs no web server, Figma plugin or build step.

## Run it

Install LÖVE 11.5 (`brew install --cask love` on macOS, or see [love2d.org](https://love2d.org)), then, from the repository root:

```bash
love frontend/lua
```

If the `love` command isn't found on macOS, use `/Applications/love.app/Contents/MacOS/love`.

This opens the collage example. Resize the window to rescale it; the layout switches when the window's width crosses 953.

## Load another composition

Pass the path to a composition's JSON:

```bash
love frontend/lua path/to/composition.json
```

Asset paths are resolved relative to that file, so unzipping a plugin export gives the right folder structure:

```bash
unzip export.zip -d my-export
love frontend/lua my-export/composition.json
```

A file that can't be read or parsed, has an unsupported `version`, or has an unsafe asset path stops with an error message. These checks cover only what this renderer depends on. To check a file fully, use `validateComposition` from `@paster/core`, or load it in the playground.

## Prepare assets

PNG and JPG files load directly. LÖVE can't read SVG, so for an asset at `images/foo.svg` the renderer loads `images/foo.png` from the same folder, and the composition keeps pointing at the SVG. Without that PNG, the item draws as a placeholder.

To rasterize at 4× with headless Chrome, run this from the folder containing `composition.json` (the path below is Chrome's on macOS):

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for svg in images/*.svg; do
  size=$(sed -nE '1s/.*width="([0-9.]+)" height="([0-9.]+)".*/\1,\2/p' "$svg")
  "$CHROME" --headless --hide-scrollbars --force-device-scale-factor=4 \
    --default-background-color=00000000 --window-size="$size" \
    --screenshot="$PWD/${svg%.svg}.png" "file://$PWD/$svg"
done
```

Check the result if you use a different tool. ImageMagick's built-in SVG renderer dropped a stroke from the collage's squiggle and softened its type.

## How it matches React

Both follow [the composition format](../../docs/composition-format.md): `minWidth` selects the layout, items draw in `zIndex` order, `rotation` is clockwise degrees, images stretch to fill their box, and layouts clip unless `clipsContent` is `false`. An item with no usable image draws as a labeled placeholder.

The differences:

| | React | LÖVE |
| --- | --- | --- |
| Width used to select a layout | The composition's container | The window |
| Fit | Fills the width; height follows, and the page scrolls | Fits inside the window, centered, with bars on the spare sides |
| Layout selection | CSS container queries | Lua, every frame |
| SVG | Rendered by the browser, stays sharp | Pre-rasterized PNG, softens if scaled past its resolution |
| Accessibility | `alt` text on images | None; `alt` is ignored |

Because the layout fits inside the window, the width it's drawn at can be less than the width that selected it. A tall layout in a wide, short window is therefore drawn narrower than its `minWidth`.

## Limitations

- Validation is partial, as described above. There are no file size limits, so only open files you trust.
- `backgroundColor` supports `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()`, which covers what the exporter emits. Any other CSS color draws no background.
- All images load at startup, including those for layouts not on screen.
- Files are read with Lua's `io` library rather than LÖVE's sandboxed filesystem, so paths outside the project work. This also means the project can't run from a packaged `.love` file without changes.

## Third-party code

[`lib/json.lua`](./lib/json.lua) is [rxi/json.lua](https://github.com/rxi/json.lua) v0.1.2, unmodified, under the MIT license included at the top of the file.

The example in `examples/` is the collage from [`examples/collage/`](../../examples/collage). The PNGs generated from its SVGs are included so that it runs straight after cloning.
