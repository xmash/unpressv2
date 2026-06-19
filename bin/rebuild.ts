#!/usr/bin/env tsx
// Node CLI: rebuild a .wpress into a standalone, runnable Next.js site.
//   npm run rebuild -- <input.wpress> [outDir]
//
// Published content only. Theme-agnostic — works for any source WordPress theme.
// The output is a complete Next.js project: cd in, npm install, npm run dev.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "../src/rebuild/generate";

const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(here, "..", "templates", "rebirth");

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const input = args[0];
  const outDir = args[1] || "rebuilt-site";
  if (!input) {
    console.error("Usage: npm run rebuild -- <input.wpress> [outDir]");
    process.exit(1);
  }

  const t0 = Date.now();
  console.log(`Reading ${input} ...`);
  const bytes = new Uint8Array(fs.readFileSync(input));

  console.log("Recovering published content and rebuilding (Next.js) ...");
  const stats = generate(bytes, outDir, TEMPLATE_DIR);

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("\n── Rebirth complete ──────────────────────────");
  console.log(`  Site:    ${stats.name}`);
  console.log(`  Pages:   ${stats.pages}`);
  console.log(`  Posts:   ${stats.posts}`);
  console.log(`  Media:   ${stats.media} files`);
  console.log(`  Output:  ${path.resolve(outDir)}  (Next.js project)`);
  console.log(`  Time:    ${secs}s`);
  console.log(`\n  Next:    cd ${outDir} && npm install && npm run dev`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
