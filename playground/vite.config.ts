import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { buildTokens, TOKENS_DIR } from "@paster/tokens";

const TOKENS_CSS = fileURLToPath(new URL("src/tokens.css", import.meta.url));

// Generates src/tokens.css before dev/build, and again whenever a token file
// changes; Vite's own watcher then hot-updates the regenerated CSS.
function tokensPlugin(): Plugin {
  return {
    name: "paster-tokens",
    async buildStart() {
      await buildTokens(TOKENS_CSS);
    },
    configureServer(server) {
      server.watcher.add(TOKENS_DIR);
      server.watcher.on("change", async (file) => {
        if (!file.startsWith(TOKENS_DIR) || !file.endsWith(".json")) {
          return;
        }
        try {
          await buildTokens(TOKENS_CSS);
        } catch (error) {
          server.config.logger.error(`[paster-tokens] ${error}`);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tokensPlugin()],
  css: {
    // Lightning CSS, so the playground's named breakpoints (@custom-media in
    // src/breakpoints.css) are replaced with real queries at build time.
    transformer: "lightningcss",
    lightningcss: { drafts: { customMedia: true } },
  },
  build: {
    // Two pages: the playground itself, and /about/ (a folder with its own
    // index.html, so the URL works on any static host without rewrites).
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        about: fileURLToPath(new URL("about/index.html", import.meta.url)),
      },
    },
  },
});
