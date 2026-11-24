import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const src = join(root, "src");
const watch = process.argv.includes("--watch");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

cpSync(join(root, "manifest.json"), join(dist, "manifest.json"));
cpSync(join(src, "popup.html"), join(dist, "popup.html"));
cpSync(join(src, "popup.css"), join(dist, "popup.css"));

const common = {
  bundle: true,
  sourcemap: true,
  target: ["chrome110"],
  logLevel: "info",
};

/** @type {import('esbuild').BuildOptions[]} */
const builds = [
  {
    ...common,
    entryPoints: [join(src, "content.ts")],
    outfile: join(dist, "content.js"),
    format: "iife",
    platform: "browser",
  },
  {
    ...common,
    entryPoints: [join(src, "popup.ts")],
    outfile: join(dist, "popup.js"),
    format: "esm",
    platform: "browser",
  },
  {
    ...common,
    entryPoints: [join(src, "background.ts")],
    outfile: join(dist, "background.js"),
    format: "esm",
    platform: "browser",
  },
];

if (watch) {
  const contexts = await Promise.all(builds.map((opts) => esbuild.context(opts)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("[dlbh/extension] watching…");
} else {
  await Promise.all(builds.map((opts) => esbuild.build(opts)));
  console.log("[dlbh/extension] built → apps/extension/dist");
}
