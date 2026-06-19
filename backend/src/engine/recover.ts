// The Recover engine: a `.wpress` archive in, recovered content + media out.
// Same module runs in Node (CLI) and the browser (Web Worker). No WordPress.

import { ingest } from "./ingest";
import { detectPrefix, keyValueTable, rowsToObjects } from "./sql";
import { cleanContent, rewriteUrls, stripSizeSuffix } from "./content";

// Standard wp_posts column order.
const POST_COLS = [
  "ID", "post_author", "post_date", "post_date_gmt", "post_content", "post_title",
  "post_excerpt", "post_status", "comment_status", "ping_status", "post_password",
  "post_name", "to_ping", "pinged", "post_modified", "post_modified_gmt",
  "post_content_filtered", "post_parent", "guid", "menu_order", "post_type",
  "post_mime_type", "comment_count",
];
const OPTION_COLS = ["option_id", "option_name", "option_value", "autoload"];

const MEDIA_RE = /\.(jpe?g|png|webp|gif|svg|ico|bmp|avif|mp4|webm|pdf|docx?|pptx?|xlsx?)$/i;
// Real media-library uploads live under uploads/<year>/<month>/ — this skips
// theme/plugin asset dirs (fusion-icons, fusion-styles, wpcode, sucuri, …).
const UPLOAD_PATH_RE = /^uploads\/\d{4}\//;
// WordPress's auto-generated size variants (we keep only the original).
const RESIZED_RE = /(-\d+x\d+|-scaled)\.\w+$/i;

export interface RecoverOptions {
  /** Which post_status values to recover. Defaults to published only. */
  statuses?: string[];
  /** Original filename — lets ingest pick the right adapter (e.g. `.wpress`,
   * which has no magic bytes). Optional; bytes are sniffed regardless. */
  filename?: string;
}

export interface RecoveredPage {
  id: string;
  type: string;
  status: string;
  title: string;
  slug: string;
  parent: string;
  menuOrder: number;
  date: string;
  modified: string;
  guid: string;
  excerpt: string;
  markdown: string;
  html: string;
  /** Original post_content — kept so the rebuild can parse layout structure. */
  raw: string;
  images: string[];
}

export interface MediaFile {
  path: string; // local path, e.g. media/2023/04/logo.png
  data: Uint8Array;
}

export interface SiteInfo {
  name: string;
  description: string;
  url: string;
}

// Public content post types we recover (free). Internal types (nav_menu_item,
// revision, attachment, fusion_element/template, etc.) are skipped. WooCommerce
// `product` is detected but gated behind the paid tier.
const CONTENT_TYPES = new Set([
  "page", "post",
  "portfolio", "avada_portfolio", "jetpack-portfolio", "project",
  "avada_faq", "faq", "sp_faq", "fusion_faq", "ufaq",
  "testimonial", "avada_testimonial",
]);
const PRODUCT_TYPES = new Set(["product", "product_variation"]);

export interface RecoverResult {
  site: SiteInfo;
  pages: RecoveredPage[];
  media: MediaFile[];
  /** Count of WooCommerce products found (gated — paid tier). */
  productCount: number;
  generatedAt: string;
}

function toLocalMediaPath(prefixedPath: string): string {
  // entries arrive as "uploads/2023/.." or "uploads/sites/178/2023/.."
  const after = prefixedPath.replace(/^uploads\//, "").replace(/^sites\/\d+\//, "");
  return "media/" + stripSizeSuffix(after);
}

/** Run the full recovery over the bytes of a `.wpress` file. */
export function recover(bytes: Uint8Array, opts: RecoverOptions = {}): RecoverResult {
  const statuses = opts.statuses ?? ["publish"];
  let dbText = "";
  const media: MediaFile[] = [];

  const { files } = ingest(bytes, opts.filename);
  for (const e of files) {
    const name = e.path.slice(e.path.lastIndexOf("/") + 1);
    if (e.path === "database.sql") {
      dbText = new TextDecoder("utf-8").decode(e.data);
    } else if (
      UPLOAD_PATH_RE.test(e.path) &&
      MEDIA_RE.test(name) &&
      !RESIZED_RE.test(name) // originals only — drop -150x150, -scaled, etc.
    ) {
      media.push({ path: toLocalMediaPath(e.path), data: e.data });
    }
  }

  const prefix = detectPrefix(dbText);
  const options = keyValueTable(
    dbText, prefix + "options", OPTION_COLS, "option_name", "option_value",
  );
  const site: SiteInfo = {
    name: options["blogname"] || "Recovered site",
    description: options["blogdescription"] || "",
    url: options["siteurl"] || "",
  };

  const pages: RecoveredPage[] = [];
  let productCount = 0;
  for (const r of rowsToObjects(dbText, prefix + "posts", POST_COLS)) {
    if (PRODUCT_TYPES.has(r.post_type)) {
      if (r.post_status === "publish") productCount++;
      continue;
    }
    if (!CONTENT_TYPES.has(r.post_type)) continue;
    if (!statuses.includes(r.post_status)) continue;

    const cleaned = cleanContent(r.post_content);
    pages.push({
      id: r.ID,
      type: r.post_type,
      status: r.post_status,
      title: r.post_title || "(untitled)",
      slug: r.post_name,
      parent: r.post_parent,
      menuOrder: parseInt(r.menu_order || "0", 10),
      date: r.post_date,
      modified: r.post_modified,
      guid: r.guid,
      excerpt: rewriteUrls(r.post_excerpt || ""),
      markdown: cleaned.markdown,
      html: cleaned.html,
      raw: r.post_content,
      images: cleaned.images,
    });
  }

  // Pages first, then posts; both by menu order then date.
  pages.sort((a, b) => {
    if (a.type !== b.type) return a.type === "page" ? -1 : 1;
    if (a.menuOrder !== b.menuOrder) return a.menuOrder - b.menuOrder;
    return a.date < b.date ? -1 : 1;
  });

  return { site, pages, media, productCount, generatedAt: new Date().toISOString() };
}

// Drafts/private content is kept but routed to its own folder so it can never be
// confused with what was actually live on the site.
export function outputFolder(status: string): string {
  if (status === "draft") return "drafts";
  if (status === "private") return "private";
  return "content";
}

/** Status-segregated path for a recovered page, e.g. drafts/foo.md. */
export function pageFilePath(p: RecoveredPage, ext = "md"): string {
  return `${outputFolder(p.status)}/${p.slug || p.id}.${ext}`;
}

export interface InventoryEntry {
  id: string;
  type: string;
  status: string;
  title: string;
  slug: string;
  file: string;
  words: number;
  images: number;
}

export interface Counts {
  published: number;
  drafts: number;
  private: number;
  pages: number;
  posts: number;
  media: number;
}

/** A compact, human-scannable summary of what was recovered. */
export function buildInventory(res: RecoverResult) {
  const byStatus = (s: string) => res.pages.filter((p) => p.status === s).length;
  const entries: InventoryEntry[] = res.pages.map((p) => ({
    id: p.id,
    type: p.type,
    status: p.status,
    title: p.title,
    slug: p.slug || p.id,
    file: pageFilePath(p),
    words: p.markdown ? p.markdown.split(/\s+/).filter(Boolean).length : 0,
    images: p.images.length,
  }));
  const counts: Counts = {
    published: byStatus("publish"),
    drafts: byStatus("draft"),
    private: byStatus("private"),
    pages: res.pages.filter((p) => p.type === "page").length,
    posts: res.pages.filter((p) => p.type === "post").length,
    media: res.media.length,
  };
  return { site: res.site, generatedAt: res.generatedAt, counts, entries };
}

/** Markdown file body with YAML frontmatter for one recovered page. */
export function pageToMarkdownFile(p: RecoveredPage): string {
  const esc = (v: string) => `"${(v || "").replace(/"/g, '\\"')}"`;
  const fm = [
    "---",
    `title: ${esc(p.title)}`,
    `slug: ${esc(p.slug)}`,
    `type: ${p.type}`,
    `status: ${p.status}`,
    `date: ${esc(p.date)}`,
    p.guid ? `original_url: ${esc(p.guid)}` : "",
    "---",
    "",
  ].filter(Boolean).join("\n");
  return fm + "\n" + (p.markdown || "") + "\n";
}
