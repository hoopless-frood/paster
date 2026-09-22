import { cpSync, statSync } from "node:fs";

// tsc doesn't copy plain .css assets into dist/, but the compiled JS still
// imports them at their original relative path.
cpSync("src", "dist", {
  recursive: true,
  filter: (src) => statSync(src).isDirectory() || src.endsWith(".module.css"),
});
