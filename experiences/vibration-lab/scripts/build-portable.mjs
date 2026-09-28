import { build } from "vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../", import.meta.url));
const result = await build({
  root,
  configFile: resolve(root, "vite.config.ts"),
  mode: "portable",
  base: "./",
  build: {
    write: false,
    copyPublicDir: false,
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    modulePreload: false,
    sourcemap: false,
    chunkSizeWarningLimit: 6000,
    rolldownOptions: { output: { codeSplitting: false } },
  },
});
assert(
  !Array.isArray(result) && "output" in result,
  "Expected one portable bundle",
);
const chunks = result.output.filter((file) => file.type === "chunk");
assert.equal(chunks.length, 1, "Portable output must contain a single script");
assert.equal(
  chunks[0].imports.length,
  0,
  "External script imports are not portable",
);
// Rolldown records same-chunk edges after inlining their imports.
assert.equal(
  chunks[0].dynamicImports.filter((name) => name !== chunks[0].fileName).length,
  0,
  "Lazy chunks must be embedded",
);
assert(!/\bimport\s*\(/.test(chunks[0].code), "Runtime dynamic imports remain");
const assets = new Map(result.output.map((file) => [file.fileName, file]));
const page = assets.get("index.html");
assert(page?.type === "asset", "Missing HTML entry");
let html = String(page.source);
const consumed = new Set(["index.html"]);
const readAsset = (url) => {
  const name = url.replace(/^\.\//, "");
  const file = assets.get(name);
  assert(file, `Missing embedded asset: ${name}`);
  consumed.add(name);
  return file.type === "chunk" ? file.code : String(file.source);
};
html = html.replace(
  /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g,
  (_tag, url) =>
    `<script type="module">${readAsset(url).replace(/<\/script/gi, "<\\/script")}</script>`,
);
html = html.replace(/<link\b[^>]*\bhref="([^"]+)"[^>]*>/g, (tag, url) => {
  assert(/rel="stylesheet"/.test(tag), `Unexpected external link: ${tag}`);
  return `<style>${readAsset(url).replace(/<\/style/gi, "<\\/style")}</style>`;
});
assert.equal(
  consumed.size,
  assets.size,
  "Unembedded files remain in the portable bundle",
);
assert(
  !/<(?:script|link)\b[^>]*\b(?:src|href)=/i.test(html),
  "External runtime resources remain",
);
const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)]
  .map((m) => m[1])
  .join("\n");
for (const match of styles.matchAll(/url\(\s*["']?([^)'"\s]+)/g))
  assert(match[1].startsWith("data:"), `External CSS resource: ${match[1]}`);
const destination = resolve(root, "portable/Vibration-Lab.html");
await mkdir(resolve(root, "portable"), { recursive: true });
await writeFile(destination, html);
console.log(
  `Portable file: ${destination} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB)`,
);
