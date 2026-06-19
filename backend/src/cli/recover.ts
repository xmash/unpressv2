#!/usr/bin/env tsx
// Node CLI: recover a .wpress into a folder + a downloadable zip.
//   npm run recover -- <input.wpress> [outDir]
//
// Proves the same engine the browser runs, headlessly, across all sites.

import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import {
  recover,
  buildInventory,
  pageToMarkdownFile,
  pageFilePath,
} from "../engine/index.js";

async function main() {
  const args = process.argv.slice(2);
  const includeDrafts = args.includes("--drafts");
  const positional = args.filter((a) => !a.startsWith("--"));
  const input = positional[0];
  const outDir = positional[1] || "recovered";
  if (!input) {
    console.error("Usage: npm run recover -- <input.wpress> [outDir] [--drafts]");
    process.exit(1);
  }

  const t0 = Date.now();
  console.log(`Reading ${input} ...`);
  const bytes = new Uint8Array(fs.readFileSync(input));
  console.log(`  ${(bytes.length / 1e6).toFixed(1)} MB`);

  console.log(`Recovering ${includeDrafts ? "(published + drafts)" : "(published only)"} ...`);
  const statuses = includeDrafts ? ["publish", "draft", "private"] : ["publish"];
  const res = recover(bytes, { statuses });
  const inv = buildInventory(res);

  fs.mkdirSync(outDir, { recursive: true });

  const zip = new JSZip();

  // inventory
  const invJson = JSON.stringify(inv, null, 2);
  fs.writeFileSync(path.join(outDir, "inventory.json"), invJson);
  zip.file("inventory.json", invJson);

  // pages -> markdown + html, routed to content/ | drafts/ | private/
  for (const p of res.pages) {
    const mdPath = pageFilePath(p, "md");
    const htmlPath = pageFilePath(p, "html");
    const md = pageToMarkdownFile(p);
    const dest = path.join(outDir, mdPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, md);
    zip.file(mdPath, md);
    if (p.html) zip.file(htmlPath, p.html);
  }

  // media
  let mediaBytes = 0;
  for (const file of res.media) {
    const dest = path.join(outDir, file.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, file.data);
    zip.file(file.path, file.data);
    mediaBytes += file.data.length;
  }

  const zipBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const zipPath = path.join(outDir, "unpress-recovery.zip");
  fs.writeFileSync(zipPath, zipBuf);

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("\n── Recovery complete ─────────────────────────");
  console.log(`  Site:      ${res.site.name}`);
  console.log(`  Published: ${inv.counts.published}  (→ content/)`);
  console.log(`  Drafts:    ${inv.counts.drafts}  (→ drafts/)`);
  if (inv.counts.private) console.log(`  Private:   ${inv.counts.private}  (→ private/)`);
  console.log(`  Types:     ${inv.counts.pages} pages, ${inv.counts.posts} posts`);
  console.log(`  Media:     ${inv.counts.media} files (${(mediaBytes / 1e6).toFixed(1)} MB)`);
  console.log(`  Output:  ${path.resolve(outDir)}`);
  console.log(`  Zip:     ${zipPath} (${(zipBuf.length / 1e6).toFixed(1)} MB)`);
  console.log(`  Time:    ${secs}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
