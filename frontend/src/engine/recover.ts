// The Recover engine: a `.wpress` archive in, recovered content + media out.
// Same module runs in Node (CLI) and the browser (Web Worker). No WordPress.

import { ingest } from "./ingest";
import { detectPrefix, keyValueTable, rowsToObjects } from "./sql";
import { cleanContent, rewriteUrls, stripSizeSuffix } from "./content";
import { extractFields, isSpam, unserializePhp, type MetaField } from "./meta";

// Standard wp_posts column order.
const POST_COLS = [
  "ID", "post_author", "post_date", "post_date_gmt", "post_content", "post_title",
  "post_excerpt", "post_status", "comment_status", "ping_status", "post_password",
  "post_name", "to_ping", "pinged", "post_modified", "post_modified_gmt",
  "post_content_filtered", "post_parent", "guid", "menu_order", "post_type",
  "post_mime_type", "comment_count",
];
const OPTION_COLS = ["option_id", "option_name", "option_value", "autoload"];
const POSTMETA_COLS = ["meta_id", "post_id", "meta_key", "meta_value"];
const COMMENT_COLS = [
  "comment_ID", "comment_post_ID", "comment_author", "comment_author_email",
  "comment_author_url", "comment_author_IP", "comment_date", "comment_date_gmt",
  "comment_content", "comment_karma", "comment_approved", "comment_agent",
  "comment_type", "comment_parent", "user_id",
];

const MEDIA_RE = /\.(jpe?g|png|webp|gif|svg|ico|bmp|avif|mp4|webm|pdf|docx?|pptx?|xlsx?)$/i;
// Real media-library uploads live under uploads/<year>/<month>/ — this skips
// theme/plugin asset dirs (fusion-icons, fusion-styles, wpcode, sucuri, …).
const UPLOAD_PATH_RE = /(?:^|\/)(?:wp-content\/)?uploads\/\d{4}\//;
// WordPress's auto-generated size variants (we keep only the original).
const RESIZED_RE = /(-\d+x\d+|-scaled)\.\w+$/i;
// Every uploads image *referenced* anywhere in a DB dump (attachments, content,
// meta, slider/theme config). Used to build a manifest when the actual files
// aren't in the backup (e.g. a SQL-only dump).
const REF_MEDIA_RE =
  /(?:wp-content\/)?uploads\/(?:sites\/\d+\/)?\d{4}\/\d{2}\/[^\s"'()\\/]+\.(?:jpe?g|png|webp|gif|svg|bmp|avif)/gi;

/** Normalize every referenced uploads image to its canonical
 * `wp-content/uploads/...` server path (originals only, deduped, sorted). */
function extractReferencedMedia(db: string): string[] {
  const set = new Set<string>();
  for (const m of db.matchAll(REF_MEDIA_RE)) {
    let p = m[0];
    if (!p.startsWith("wp-content/")) p = "wp-content/" + p;
    p = p.replace(/-\d+x\d+(\.\w+)$/i, "$1").replace(/-scaled(\.\w+)$/i, "$1");
    set.add(p);
    if (set.size > 5000) break;
  }
  return [...set].sort();
}

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
  /** Custom fields recovered from postmeta (jobs, lessons, events, ACF, …). */
  fields: MetaField[];
}

export interface RecoveredComment {
  id: string;
  postId: string;
  author: string;
  date: string;
  content: string;
  approved: boolean;
}

export interface ThemeInfo {
  slug: string;
  name: string;
  active: boolean;
}

/** WP 6.5+ Font Library summary — shown under Appearance, not as content. */
export interface FontInfo {
  families: string[];
  faces: number;
}

export interface PluginInfo {
  slug: string;
  active: boolean;
}

/** A teaser product for the preview — name only. Pricing/SKU/stock (in postmeta)
 * are deliberately NOT recovered for products until the store add-on is bought. */
export interface ProductPreview {
  title: string;
  slug: string;
}

const PRODUCT_SAMPLE = 6;

export interface MediaFile {
  path: string; // local path, e.g. media/2023/04/logo.png
  data: Uint8Array;
}

export interface SiteInfo {
  name: string;
  description: string;
  url: string;
}

// v2: recover EVERY post type by default. Instead of an allowlist (which silently
// dropped plugin content like jobs/lessons), we DENY only WordPress internals and
// page-builder scaffolding. Anything else — jobpost, sfwd-lessons, tribe_events,
// portfolio, testimonials, custom CPTs — becomes recoverable content automatically.
const SKIP_TYPES = new Set([
  "revision", "nav_menu_item", "attachment", "custom_css", "customize_changeset",
  "oembed_cache", "user_request", "wp_block", "wp_template", "wp_template_part",
  "wp_global_styles", "wp_navigation", "wpcode",
  // WP 6.5+ Font Library — core Appearance, folded into the Appearance tab (not content)
  "wp_font_family", "wp_font_face",
  // Avada / Fusion builder internals
  "fusion_element", "fusion_template", "fusion_tb_layout", "fusion_tb_section",
  "fusion_form", "fusion_icons", "fusion_form_submission", "fma_blocks",
  "awb_off_canvas", "slide", "themefusion_elastic",
  // ACF / form / popup builder definitions (not user content)
  "acf-field", "acf-field-group", "acf-post-type", "acf-taxonomy",
  // Form/application SUBMISSIONS (user PII, not site content to rebuild)
  "jobpost_applicants", "wpcf7_contact_form", "flamingo_inbound", "frm_form_actions",
  "nf_sub", "wpforms_log", "give_payment", "shop_order", "shop_order_refund",
]);
const PRODUCT_TYPES = new Set(["product", "product_variation"]);

function isContentType(type: string): boolean {
  return !SKIP_TYPES.has(type) && !PRODUCT_TYPES.has(type);
}

export interface RecoverResult {
  site: SiteInfo;
  pages: RecoveredPage[];
  media: MediaFile[];
  /** Image paths the DB references but that aren't present as files (e.g. a
   * SQL-only dump). The manifest a user hands their host to demand the uploads. */
  referencedMedia: string[];
  /** Count of WooCommerce products found (gated — paid tier). */
  productCount: number;
  /** Up to PRODUCT_SAMPLE teaser product names for the preview (no pricing). */
  productSample: ProductPreview[];
  /** Approved comments recovered from wp_comments. */
  comments: RecoveredComment[];
  /** Installed themes (with the active one flagged). */
  themes: ThemeInfo[];
  /** Font Library families/faces (Appearance, not content). */
  fonts: FontInfo;
  /** Installed plugins (with active ones flagged). */
  plugins: PluginInfo[];
  /** Count of injected casino/gambling spam posts that were filtered out. */
  spamCount: number;
  generatedAt: string;
}

function toLocalMediaPath(prefixedPath: string): string {
  // entries arrive as "uploads/2023/.." or "wp-content/uploads/2023/.." or
  // "uploads/sites/178/2023/.."
  const after = prefixedPath
    .replace(/^wp-content\//, "")
    .replace(/^uploads\//, "")
    .replace(/^sites\/\d+\//, "");
  return "media/" + stripSizeSuffix(after);
}

function findDatabaseFile(files: { path: string; data: Uint8Array }[]) {
  const exact = files.find((e) => e.path === "database.sql" || e.path.endsWith("/database.sql"));
  if (exact) return exact;
  return files.find((e) => {
    if (!/\.sql$/i.test(e.path)) return false;
    const head = new TextDecoder("utf-8", { fatal: false })
      .decode(e.data.subarray(0, Math.min(4096, e.data.length)))
      .toLowerCase();
    return head.includes("insert into") || head.includes("create table") || head.includes("mysql dump");
  });
}

/** Group postmeta rows into a per-post `meta_key → meta_value` map (kept posts only). */
function parsePostMeta(
  dbText: string,
  prefix: string,
  keepIds: Set<string>,
): Map<string, Record<string, string>> {
  const byPost = new Map<string, Record<string, string>>();
  for (const r of rowsToObjects(dbText, prefix + "postmeta", POSTMETA_COLS)) {
    if (keepIds.size && !keepIds.has(r.post_id)) continue;
    let m = byPost.get(r.post_id);
    if (!m) {
      m = {};
      byPost.set(r.post_id, m);
    }
    m[r.meta_key] = r.meta_value;
  }
  return byPost;
}

/** Recover approved, real comments (skip spam/trash/pingbacks). */
function parseComments(dbText: string, prefix: string): RecoveredComment[] {
  const out: RecoveredComment[] = [];
  for (const r of rowsToObjects(dbText, prefix + "comments", COMMENT_COLS)) {
    if (r.comment_approved === "spam" || r.comment_approved === "trash") continue;
    if (r.comment_type === "pingback" || r.comment_type === "trackback") continue;
    if (!r.comment_content?.trim()) continue;
    out.push({
      id: r.comment_ID,
      postId: r.comment_post_ID,
      author: r.comment_author || "Anonymous",
      date: r.comment_date,
      content: cleanContent(r.comment_content).markdown || r.comment_content,
      approved: r.comment_approved === "1",
    });
  }
  return out;
}

/** Distinct top-level directory names under a wp-content subfolder. */
function dirsUnder(files: { path: string }[], re: RegExp): Set<string> {
  const set = new Set<string>();
  for (const f of files) {
    const m = f.path.match(re);
    if (m && m[1] && m[1] !== "index.php") set.add(m[1]);
  }
  return set;
}

function detectThemes(files: { path: string }[], options: Record<string, string>): ThemeInfo[] {
  const slugs = dirsUnder(files, /(?:^|\/)(?:wp-content\/)?themes\/([^/]+)\//);
  const active = new Set([options["stylesheet"], options["template"]].filter(Boolean));
  return [...slugs]
    .sort()
    .map((slug) => ({ slug, name: slug, active: active.has(slug) }));
}

function detectPlugins(files: { path: string }[], options: Record<string, string>): PluginInfo[] {
  const slugs = dirsUnder(files, /(?:^|\/)(?:wp-content\/)?plugins\/([^/]+)\//);
  const active = new Set<string>();
  const parsed = unserializePhp(options["active_plugins"] || "");
  if (Array.isArray(parsed)) {
    for (const p of parsed) {
      const dir = String(p).split("/")[0];
      if (dir) active.add(dir);
    }
  }
  return [...slugs].sort().map((slug) => ({ slug, active: active.has(slug) }));
}

/** Run the full recovery over backup bytes (any supported ingest format). */
export function recover(bytes: Uint8Array, opts: RecoverOptions = {}): RecoverResult {
  const statuses = opts.statuses ?? ["publish"];
  let dbText = "";
  const media: MediaFile[] = [];

  const { files } = ingest(bytes, opts.filename);
  const dbFile = findDatabaseFile(files);
  if (dbFile) {
    dbText = new TextDecoder("utf-8", { fatal: false }).decode(dbFile.data);
  }

  for (const e of files) {
    const name = e.path.slice(e.path.lastIndexOf("/") + 1);
    if (
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

  // First pass: keep every content row (any post type), gate products, drop
  // injected casino-spam posts. Then join postmeta only for the rows we kept.
  const contentRows: Record<string, string>[] = [];
  const productSample: ProductPreview[] = [];
  const fontFamilies: string[] = [];
  let fontFaces = 0;
  let productCount = 0;
  let spamCount = 0;
  for (const r of rowsToObjects(dbText, prefix + "posts", POST_COLS)) {
    // WP Font Library → Appearance (collected here, not surfaced as content).
    if (r.post_type === "wp_font_family") {
      if (r.post_status === "publish") fontFamilies.push(r.post_title || r.post_name);
      continue;
    }
    if (r.post_type === "wp_font_face") {
      fontFaces++;
      continue;
    }
    if (PRODUCT_TYPES.has(r.post_type)) {
      // Count/sample only top-level products (not variations); name only.
      if (r.post_type === "product" && r.post_status === "publish") {
        productCount++;
        if (productSample.length < PRODUCT_SAMPLE) {
          productSample.push({ title: r.post_title || "(untitled product)", slug: r.post_name });
        }
      }
      continue;
    }
    if (!isContentType(r.post_type)) continue;
    if (!statuses.includes(r.post_status)) continue;
    // Spam injection is almost always type=post — don't risk filtering pages/CPTs.
    if (r.post_type === "post" && isSpam(r.post_title || "", r.post_content || "")) {
      spamCount++;
      continue;
    }
    contentRows.push(r);
  }

  const keepIds = new Set(contentRows.map((r) => r.ID));
  const metaByPost = parsePostMeta(dbText, prefix, keepIds);

  const pages: RecoveredPage[] = contentRows.map((r) => {
    const cleaned = cleanContent(r.post_content);
    return {
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
      fields: extractFields(metaByPost.get(r.ID) || {}),
    };
  });

  // Pages first, then posts; both by menu order then date.
  pages.sort((a, b) => {
    if (a.type !== b.type) return a.type === "page" ? -1 : 1;
    if (a.menuOrder !== b.menuOrder) return a.menuOrder - b.menuOrder;
    return a.date < b.date ? -1 : 1;
  });

  const referencedMedia = dbText ? extractReferencedMedia(dbText) : [];
  const comments = dbText ? parseComments(dbText, prefix) : [];
  const themes = detectThemes(files, options);
  const plugins = detectPlugins(files, options);

  return {
    site,
    pages,
    media,
    referencedMedia,
    productCount,
    productSample,
    comments,
    themes,
    fonts: { families: fontFamilies, faces: fontFaces },
    plugins,
    spamCount,
    generatedAt: new Date().toISOString(),
  };
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
  fields: MetaField[];
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
    fields: p.fields,
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

/** Markdown file body with YAML frontmatter for one recovered page. Custom
 * fields (jobs, lessons, events, ACF, …) are emitted as a `fields:` map so the
 * full record — not just title/body — survives the export. */
export function pageToMarkdownFile(p: RecoveredPage): string {
  const esc = (v: string) => `"${(v || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const fieldLines =
    p.fields.length > 0
      ? ["fields:", ...p.fields.map((f) => `  ${esc(f.label)}: ${esc(f.value)}`)]
      : [];
  const fm = [
    "---",
    `title: ${esc(p.title)}`,
    `slug: ${esc(p.slug)}`,
    `type: ${p.type}`,
    `status: ${p.status}`,
    `date: ${esc(p.date)}`,
    p.guid ? `original_url: ${esc(p.guid)}` : "",
    ...fieldLines,
    "---",
    "",
  ].filter(Boolean).join("\n");
  return fm + "\n" + (p.markdown || "") + "\n";
}
