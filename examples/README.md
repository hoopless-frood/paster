# Examples

Ready-made compositions for trying Paster without preparing your own. The
playground (`pnpm run dev`, or the [hosted
playground](https://paster.annapearson.dev/)) loads both with its **Load
collage example** and **Load geometry example** buttons, or you can upload or
paste the files yourself.

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
  every item's image. The playground bundles this file for its example
  button, so replacing it updates that too.
- `collage.json` is the same `composition.json` as inside the ZIP, for
  reading without unzipping.

Re-export the ZIP after plugin changes that affect image output, so it keeps
matching what the plugin produces.
