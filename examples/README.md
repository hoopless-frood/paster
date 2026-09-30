# Examples

Ready-made compositions for trying Paster without preparing your own. Paste
a `.json` file, or upload a `.zip`, in the playground (`pnpm run dev`, or the
[hosted playground](https://paster.annapearson.dev/)).

## `geometry/`

`composition.json` is the small three-image sample, with geometry only and no
image files. It's the same data as `sampleComposition` in `@paster/core`, which
the playground starts with; a core test keeps the two identical. Its asset
paths are illustrative, so the playground shows labeled placeholder boxes.

## `collage/`

A real collage exported by the Figma plugin:

- `collage.fig` is the Figma source file. Import it into Figma, select the
  composition frame and run the plugin to reproduce the export.
- `collage.zip` is the plugin's **Export ZIP** output: the composition plus
  every item's image.
- `collage.json` is the same `composition.json` as inside the ZIP, for
  reading without unzipping.

Re-export the ZIP after plugin changes that affect image output, so it keeps
matching what the plugin produces.
