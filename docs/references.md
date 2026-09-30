# Figma Documentation References

Official Figma documentation relevant to developing Paster.

Paster uses the **Figma Plugin API**, not the REST API. The plugin runs inside Figma to inspect compositions, extract geometry, and export assets.

## Plugin setup

- [Plugin API introduction](https://developers.figma.com/docs/plugins/) — Overview of the plugin environment.
- [Plugin quickstart](https://developers.figma.com/docs/plugins/plugin-quickstart-guide/) — Local installation and development.
- [Plugin manifest](https://developers.figma.com/docs/plugins/manifest/) — Entry points, configuration, and permissions.
- [How plugins run](https://developers.figma.com/docs/plugins/how-plugins-run/) — Plugin sandbox and UI architecture.

## Document structure and geometry

- [Accessing the document](https://developers.figma.com/docs/plugins/accessing-document/) — Read selections and traverse document nodes.
- [FrameNode](https://developers.figma.com/docs/plugins/api/FrameNode/) — Frame properties, dimensions, and `clipsContent`.
- [Node properties](https://developers.figma.com/docs/plugins/api/node-properties/) — Shared geometry, `rotation`, visibility, and transforms.
- [Children](https://developers.figma.com/docs/plugins/api/properties/nodes-children/) — Traverse child nodes and determine stacking order.
- [itemReverseZIndex](https://developers.figma.com/docs/plugins/api/properties/nodes-itemreversezindex/) — Reversed stacking in Auto Layout.

Paster reads each item's own `x`/`y`/`width`/`height`, which describe its
unrotated frame relative to its layout's origin (not its bounding box,
which grows when the item is rotated). Child order determines the exported
z-index. An item's own `rotation` is read and converted to CSS's
clockwise-positive convention (see [figma-guide.md](./figma-guide.md#rotation));
Figma's own value is counterclockwise-positive.

## Images and SVG

- [exportAsync](https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync/) — Export rendered nodes as PNG, JPG, or SVG.
- [ExportSettings](https://developers.figma.com/docs/plugins/api/ExportSettings/) — Configure image formats and export options.
- [Image API](https://developers.figma.com/docs/plugins/api/Image/) — Retrieve original image bytes and dimensions.

Rendered-node exports preserve the visual appearance of a Figma frame. Original image extraction is a separate workflow.

## Plugin UI and messaging

- [Creating a UI](https://developers.figma.com/docs/plugins/creating-ui/) — Build the plugin interface.
- [figma.ui](https://developers.figma.com/docs/plugins/api/figma-ui/) — Communicate between plugin code and the UI.
- [postMessage](https://developers.figma.com/docs/plugins/api/properties/figma-ui-postmessage/) — Transfer composition data and exported assets.

## Future development

- [Plugin data](https://developers.figma.com/docs/plugins/api/properties/nodes-setplugindata/) — Store persistent frame identifiers.
- [GroupNode](https://developers.figma.com/docs/plugins/api/GroupNode/) — Groups are exported as single items today; nested compositions would build on this.
- [Transform](https://developers.figma.com/docs/plugins/api/Transform/) — Handle non-rotation transforms (skew, matrices); rotation itself is already handled (see above).

Refer to [PLAN.md](../PLAN.md) for implementation milestones and the feature backlog.