// Bundle src/worker.ts into a single classic-worker script that the
// Quarto report loads via `new Worker("data/sim.worker.js")`.

import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

await build({
  entryPoints: [resolve(ROOT, "src/worker.ts")],
  outfile: resolve(ROOT, "report/data/sim.worker.js"),
  bundle: true,
  format: "iife",
  target: "es2022",
  platform: "browser",
  minify: false,
  sourcemap: false,
  logLevel: "info",
});
