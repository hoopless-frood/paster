import { cpSync, statSync } from "node:fs";

// tsc compiles .ts/.tsx but never copies plain .css assets into dist/ — the
// compiled JS still imports "./Composition.module.css" at its original
// relative path, so the actual file has to land there too.
cpSync("src", "dist", {
  recursive: true,
  filter: (src) => statSync(src).isDirectory() || src.endsWith(".module.css"),
});
