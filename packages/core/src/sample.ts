import { COMPOSITION_SCHEMA_VERSION, type Composition } from "./types.js";

export const sampleComposition: Composition = {
  version: COMPOSITION_SCHEMA_VERSION,
  id: "homepage",
  name: "Homepage",
  assets: [
    { id: "hero-image", path: "images/hero.png", width: 1600, height: 900 },
    { id: "portrait-image", path: "images/portrait.png", width: 800, height: 1000 },
  ],
  layouts: [
    {
      id: "mobile",
      name: "Mobile",
      minWidth: 0,
      width: 375,
      height: 812,
      items: [
        { id: "hero", x: 0, y: 0, width: 375, height: 240, zIndex: 0, assetId: "hero-image" },
        {
          id: "portrait",
          x: 24,
          y: 260,
          width: 327,
          height: 400,
          zIndex: 1,
          assetId: "portrait-image",
        },
      ],
    },
    {
      id: "desktop",
      name: "Desktop",
      minWidth: 1024,
      width: 1440,
      height: 900,
      items: [
        {
          id: "portrait",
          x: 80,
          y: 80,
          width: 480,
          height: 600,
          zIndex: 0,
          assetId: "portrait-image",
        },
        { id: "hero", x: 600, y: 0, width: 840, height: 900, zIndex: 1, assetId: "hero-image" },
      ],
    },
  ],
};
