import { build } from "esbuild";
import { mkdirSync, readFileSync, watch as watchDir, writeFileSync } from "node:fs";
import { buildTokens, TOKENS_DIR } from "@paster/tokens";

const isWatch = process.argv.includes("--watch");

async function buildOnce() {
  mkdirSync("dist", { recursive: true });
  await buildTokens("src/tokens.css");

  // Figma's plugin UI is a single string passed to figma.showUI(__html__, ...);
  // there's no server to resolve a sibling <script src="ui.js">, so the UI's
  // bundled JS has to be inlined into the HTML before code.js embeds it.
  const uiBundle = await build({
    entryPoints: ["src/ui.ts"],
    bundle: true,
    format: "iife",
    target: "es2017",
    write: false,
    logLevel: "silent",
  });
  const uiScript = uiBundle.outputFiles[0].text;
  // Shared design tokens come first so ui.css's own rules can reference them.
  const uiStyle = readFileSync("src/tokens.css", "utf8") + "\n" + readFileSync("src/ui.css", "utf8");

  const template = readFileSync("src/ui.html", "utf8");
  const html = template
    .replace("<!-- STYLE -->", `<style>\n${uiStyle}</style>`)
    .replace("<!-- SCRIPT -->", `<script>\n${uiScript}\n</script>`);
  writeFileSync("dist/ui.html", html);

  await build({
    entryPoints: ["src/code.ts"],
    outfile: "dist/code.js",
    bundle: true,
    format: "iife",
    target: "es2017",
    define: { __html__: JSON.stringify(html) },
    logLevel: "info",
  });
}

await buildOnce();

if (isWatch) {
  console.log("Watching plugin/src and tokens/ for changes...");
  let pending = false;
  const rebuild = () => {
    if (pending) {
      return;
    }
    pending = true;
    setTimeout(() => {
      pending = false;
      buildOnce()
        .then(() => console.log("Rebuilt."))
        .catch((error) => console.error(error));
    }, 100);
  };
  watchDir("src", { recursive: true }, rebuild);
  watchDir(TOKENS_DIR, rebuild);
}
