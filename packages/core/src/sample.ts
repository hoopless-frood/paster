import { COMPOSITION_SCHEMA_VERSION, type Composition } from "./types.js";

// A single art-directed composition — an asymmetric grid of images with
// generous negative space, not a conventional website's hero/content layout.
export const sampleComposition: Composition = {
  version: COMPOSITION_SCHEMA_VERSION,
  id: "geometry-example",
  name: "Geometry Example",
  assets: [
    { id: "image-a-asset", path: "images/image-a.png", width: 1600, height: 1100 },
    { id: "image-b-asset", path: "images/image-b.png", width: 1200, height: 900 },
    { id: "image-c-asset", path: "images/image-c.png", width: 1000, height: 700 },
  ],
  layouts: [
    {
      id: "mobile",
      name: "Mobile",
      minWidth: 0,
      width: 375,
      height: 812,
      backgroundColor: "#f5f1ea",
      items: [
        { id: "image-a", x: 20, y: 40, width: 335, height: 280, zIndex: 1, assetId: "image-a-asset" },
        { id: "image-b", x: 110, y: 360, width: 245, height: 200, zIndex: 0, assetId: "image-b-asset" },
        { id: "image-c", x: 20, y: 610, width: 180, height: 150, zIndex: 2, assetId: "image-c-asset" },
      ],
    },
    {
      id: "desktop",
      name: "Desktop",
      minWidth: 1024,
      width: 1440,
      height: 900,
      backgroundColor: "#eae6e0",
      items: [
        { id: "image-a", x: 80, y: 80, width: 680, height: 500, zIndex: 0, assetId: "image-a-asset" },
        { id: "image-b", x: 860, y: 200, width: 500, height: 340, zIndex: 1, assetId: "image-b-asset" },
        { id: "image-c", x: 200, y: 660, width: 420, height: 180, zIndex: 2, assetId: "image-c-asset" },
      ],
    },
  ],
};
