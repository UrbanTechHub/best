// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import fs from "fs";
import path from "path";

/**
 * The TanStack Start prerender preview server looks for dist/server/server.js,
 * but the Cloudflare build outputs dist/server/index.js. This plugin creates
 * a server.js re-export after the server build completes.
 */
function serverJsFixPlugin(): Plugin {
  return {
    name: "server-js-fix",
    apply: "build",
    enforce: "post",
    closeBundle() {
      const serverDir = path.resolve("dist/server");
      const indexPath = path.join(serverDir, "index.js");
      const serverPath = path.join(serverDir, "server.js");
      if (fs.existsSync(indexPath) && !fs.existsSync(serverPath)) {
        fs.copyFileSync(indexPath, serverPath);
      }
    },
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    spa: {
      enabled: true,
    },
    prerender: {
      enabled: true,
      crawlLinks: true,
      autoSubfolderIndex: true,
    },
  },
  vite: {
    plugins: [serverJsFixPlugin()],
  },
});
