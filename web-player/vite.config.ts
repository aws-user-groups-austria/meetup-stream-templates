/**
 * The web player: a Vite app that imports the compositions from ../src.
 *
 * - base "./" so the built folder works wherever it is served from: the
 *   domain root, /present/ on GitHub Pages, a USB stick behind a static server.
 * - react, react-dom and remotion are aliased to this folder's copies. The
 *   scenes in ../src would otherwise resolve ../node_modules/react, the Player
 *   would bring its own, and Remotion's hooks fail across two Reacts.
 *   qrcode, zod and @remotion/fonts (imported by ../src) are aliased the same
 *   way, so the build uses the versions this package.json declares and this
 *   folder's npm audit covers everything that ends up in dist/.
 * - Two public folders: ./public (the event files and people/ photos, owned
 *   by the player) and ../public (fonts and logos, shared with Studio and the
 *   stills). Vite has
 *   one publicDir, so the shared one is served in dev and copied into dist by
 *   the small plugin below.
 */
/// <reference types="vitest/config" />
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const templates = path.resolve(here, "..");
const sharedPublic = path.join(templates, "public");
const mod = (name: string) => path.join(here, "node_modules", name);

/** Folders shared by every meetup, copied from meetup-event-vienna by `make player-event`. */
const SHARED = ["people", "logos", "badges", "community"];

/** README files describe the source folders; they do not belong in a served build. */
const isReadme = (file: string) => path.basename(file).toLowerCase() === "readme.md";

/**
 * Amazon Ember may be used but never published: public/fonts/amazon-ember/
 * (gitignored, filled by `make fonts`) is served by the dev server only and
 * never copied into dist/, so the website never serves the files. The built
 * player asks for the installed font instead (src/staticBase.ts).
 */
const EMBER_DIR = path.join(sharedPublic, "fonts", "amazon-ember");
const isEmber = (file: string) => file === EMBER_DIR || file.startsWith(EMBER_DIR + path.sep);

const sharedPublicPlugin = (): Plugin => {
  let outDir = path.join(here, "dist");
  return {
    name: "shared-public",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? "").split("?")[0] ?? "");
        const file = path.join(sharedPublic, url);
        if (!file.startsWith(sharedPublic + path.sep) || isReadme(file)) return next();
        fs.stat(file, (err, st) => {
          if (err || !st.isFile()) return next();
          const ext = path.extname(file).toLowerCase();
          const type =
            ({ ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" } as Record<string, string>)[ext] ??
            "application/octet-stream";
          res.setHeader("Content-Type", type);
          fs.createReadStream(file).pipe(res);
        });
      });
    },
    closeBundle() {
      fs.cpSync(sharedPublic, outDir, { recursive: true, filter: (src) => !isReadme(src) && !isEmber(src) });
      // ./public has READMEs too (public/, events/, and the shared folders); Vite copied them.
      for (const rel of ["README.md", "events/README.md", ...SHARED.map((d) => `${d}/README.md`)]) fs.rmSync(path.join(outDir, rel), { force: true });
    },
  };
};

export default defineConfig({
  plugins: [react(), sharedPublicPlugin()],
  base: "./",
  publicDir: "public",
  resolve: {
    alias: {
      react: mod("react"),
      "react-dom": mod("react-dom"),
      remotion: mod("remotion"),
      "@remotion/fonts": mod("@remotion/fonts"),
      qrcode: mod("qrcode"),
      zod: mod("zod"),
    },
    dedupe: ["react", "react-dom", "remotion"],
  },
  server: {
    port: 4100,
    strictPort: true,
    host: "127.0.0.1",
    // ../src (the scenes) sits outside this folder.
    fs: { allow: [templates] },
  },
  preview: { port: 4101, strictPort: true, host: "127.0.0.1" },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 2000 },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
  },
});
