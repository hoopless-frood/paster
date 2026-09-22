import { build, context } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

const watch = process.argv.includes("--watch");

mkdirSync("dist", { recursive: true });
cpSync("src/ui.html", "dist/ui.html");

const options = {
  entryPoints: ["src/code.ts"],
  outfile: "dist/code.js",
  bundle: true,
  format: "iife",
  target: "es2017",
  logLevel: "info",
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
