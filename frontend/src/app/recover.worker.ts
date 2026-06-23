/// <reference lib="webworker" />
// Runs the Recover engine entirely in the browser, off the main thread.
// Two phases, so the free preview never does the paid work:
//   1. "preview"  — parse + categorize, return everything to SEE (free, auto).
//                   Also returns one watermarked sample page to build trust.
//   2. "export"   — build the full .zip from the already-parsed result, on
//                   demand, only after the user has unlocked the download.
// The recovered result is cached in the worker between the two so we never
// re-parse. Nothing is ever sent to a server.

import JSZip from "jszip";
import {
  recover,
  buildInventory,
  pageToMarkdownFile,
  pageFilePath,
  categorize,
  type Counts,
  type Category,
  type SiteStructure,
  type RecoveredComment,
  type ThemeInfo,
  type PluginInfo,
  type ProductPreview,
  type FontInfo,
} from "@unpress/engine";
import { PREVIEW } from "../lib/limits";

type RecoverResult = ReturnType<typeof recover>;
type Inventory = ReturnType<typeof buildInventory>;

export interface MediaThumb {
  name: string;
  blob: Blob;
}

export type WorkerResponse =
  | {
      kind: "preview";
      ok: true;
      site: { name: string; description: string; url: string };
      counts: Counts;
      categories: Category[];
      structure: SiteStructure;
      productCount: number;
      productSample: ProductPreview[];
      comments: RecoveredComment[];
      /** Full comment count (preview shows only the first PREVIEW.comments). */
      commentsTotal: number;
      themes: ThemeInfo[];
      fonts: FontInfo;
      plugins: PluginInfo[];
      spamCount: number;
      media: {
        count: number;
        bytes: number;
        files: string[];
        /** Full media file count (preview lists only the first PREVIEW.images). */
        filesTotal: number;
        thumbs: MediaThumb[];
        /** Images referenced in the DB but not present as files (manifest). */
        referenced: string[];
      };
      /** A single watermarked page the user can download free to vet quality. */
      sample: { name: string; text: string } | null;
    }
  | { kind: "export"; ok: true; blob: Blob; filename: string }
  | { ok: false; error: string };

type WorkerRequest =
  | { action?: "preview"; buffer: ArrayBuffer; includeDrafts: boolean; filename: string }
  | { action: "export" };

const IMG_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;
const mime = (name: string) => {
  const ext = name.toLowerCase().split(".").pop();
  return ext === "jpg" ? "image/jpeg" : `image/${ext}`;
};

// Cached across messages so export reuses the parse from preview.
let cached: RecoverResult | null = null;
let cachedInv: Inventory | null = null;
let baseName = "site";

function watermark(md: string): string {
  return (
    md +
    "\n\n---\n\n" +
    "> 🟢 Recovered free with **Unpress** — this is a 1-page sample.\n" +
    "> Get your whole site (every page, post & photo) at wpunpress.com\n"
  );
}

function renderComments(comments: RecoveredComment[]): string {
  return (
    "\n\n## Comments\n\n" +
    comments
      .map((c) => `**${c.author}** — ${c.date?.slice(0, 10)}\n\n${c.content}\n`)
      .join("\n---\n\n")
  );
}

async function buildZip(res: RecoverResult, inv: Inventory): Promise<Blob> {
  const zip = new JSZip();
  zip.file("inventory.json", JSON.stringify(inv, null, 2));

  // Group comments by the post they belong to so each page/post markdown
  // carries its own discussion (comments are WP-core — they ship too).
  const commentsByPost = new Map<string, RecoveredComment[]>();
  for (const c of res.comments) {
    const arr = commentsByPost.get(c.postId) ?? [];
    arr.push(c);
    commentsByPost.set(c.postId, arr);
  }

  for (const p of res.pages) {
    let md = pageToMarkdownFile(p);
    const cms = commentsByPost.get(p.id);
    if (cms?.length) md += renderComments(cms);
    zip.file(pageFilePath(p, "md"), md);
    if (p.html) zip.file(pageFilePath(p, "html"), p.html);
  }

  // Structured data dumps — the whole point of the product is you get it ALL.
  zip.file("data/comments.json", JSON.stringify(res.comments, null, 2));
  zip.file(
    "data/site.json",
    JSON.stringify(
      {
        site: res.site,
        counts: inv.counts,
        themes: res.themes,
        plugins: res.plugins,
        productCount: res.productCount,
        spamFiltered: res.spamCount,
        generatedAt: res.generatedAt,
      },
      null,
      2,
    ),
  );

  for (const f of res.media) zip.file(f.path, f.data);
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const data = e.data;
  try {
    // ---- Phase 2: paid export ----
    if (data.action === "export") {
      if (!cached || !cachedInv) throw new Error("Nothing to export — recover a backup first.");
      const blob = await buildZip(cached, cachedInv);
      const msg: WorkerResponse = {
        kind: "export",
        ok: true,
        blob,
        filename: `${baseName}-recovery.zip`,
      };
      self.postMessage(msg);
      return;
    }

    // ---- Phase 1: free preview ----
    const { buffer, includeDrafts, filename } = data;
    const bytes = new Uint8Array(buffer);
    const statuses = includeDrafts ? ["publish", "draft", "private"] : ["publish"];
    const res = recover(bytes, { statuses, filename });
    const inv = buildInventory(res);
    const cat = categorize(res);

    cached = res;
    cachedInv = inv;
    baseName = (res.site.name || "site").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

    let mediaBytes = 0;
    for (const f of res.media) mediaBytes += f.data.length;
    const allFiles = res.media.map((m) => m.path);
    const thumbs: MediaThumb[] = res.media
      .filter((m) => IMG_RE.test(m.path))
      .slice(0, PREVIEW.images)
      .map((m) => ({
        name: m.path,
        blob: new Blob([m.data.slice()], { type: mime(m.path) }),
      }));

    // Preview gating: full COUNTS cross to the UI, but only the first few ITEMS
    // of each kind — the full content stays in the worker until paid export.
    const limit = (c: Category) =>
      c.items.slice(0, c.key === "pages" ? PREVIEW.pages : c.key === "posts" ? PREVIEW.posts : PREVIEW.items);
    const previewCategories: Category[] = cat.categories.map((c) => ({ ...c, items: limit(c) }));

    const first = res.pages[0];
    const sample = first
      ? { name: (pageFilePath(first, "md").split("/").pop() ?? "sample.md"), text: watermark(pageToMarkdownFile(first)) }
      : null;

    const msg: WorkerResponse = {
      kind: "preview",
      ok: true,
      site: res.site,
      counts: inv.counts,
      categories: previewCategories,
      structure: cat.structure,
      productCount: cat.productCount,
      productSample: res.productSample,
      comments: res.comments.slice(0, PREVIEW.comments),
      commentsTotal: res.comments.length,
      themes: res.themes,
      fonts: res.fonts,
      plugins: res.plugins,
      spamCount: res.spamCount,
      media: {
        count: res.media.length,
        bytes: mediaBytes,
        files: allFiles.slice(0, PREVIEW.images),
        filesTotal: allFiles.length,
        thumbs,
        referenced: res.referencedMedia,
      },
      sample,
    };
    self.postMessage(msg);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const msg: WorkerResponse = { ok: false, error };
    self.postMessage(msg);
  }
};
