// Groups recovered content into tabs. v2 model (mirrors the WP admin):
//   • CORE tabs   — the nouns stock WordPress ships without plugins: Pages, Posts.
//     (Media / Comments / Appearance are core too, but live on RecoverResult and
//      are rendered as their own tabs by the app.)
//   • FREE-FORM tabs — every other post type a PLUGIN added (jobs, lessons,
//     events, portfolio, testimonials, …) is discovered and gets its own tab,
//     auto-labelled. No hardcoded list.

import type { RecoverResult, RecoveredPage } from "./recover";
import type { MetaField } from "./meta";
import { humanize } from "./meta";

// Known synonyms → one canonical bucket + a friendly, pluralized label. Anything
// not listed here still gets a tab, labelled by humanizing its post_type slug.
const KNOWN: Record<string, { key: string; label: string }> = {
  page: { key: "pages", label: "Pages" },
  post: { key: "posts", label: "Posts" },
  portfolio: { key: "portfolio", label: "Portfolio" },
  avada_portfolio: { key: "portfolio", label: "Portfolio" },
  "jetpack-portfolio": { key: "portfolio", label: "Portfolio" },
  project: { key: "portfolio", label: "Portfolio" },
  avada_faq: { key: "faqs", label: "FAQs" },
  faq: { key: "faqs", label: "FAQs" },
  sp_faq: { key: "faqs", label: "FAQs" },
  fusion_faq: { key: "faqs", label: "FAQs" },
  ufaq: { key: "faqs", label: "FAQs" },
  testimonial: { key: "testimonials", label: "Testimonials" },
  avada_testimonial: { key: "testimonials", label: "Testimonials" },
  jobpost: { key: "jobs", label: "Jobs" },
  job_listing: { key: "jobs", label: "Jobs" },
  noo_job: { key: "jobs", label: "Jobs" },
  "awsm_job_openings": { key: "jobs", label: "Jobs" },
  "sfwd-lessons": { key: "lessons", label: "Lessons" },
  lesson: { key: "lessons", label: "Lessons" },
  "sfwd-courses": { key: "courses", label: "Courses" },
  course: { key: "courses", label: "Courses" },
  tribe_events: { key: "events", label: "Events" },
  event: { key: "events", label: "Events" },
};

// Core tabs render first, in WP-admin order. Everything else is free-form and
// sorted by label after these.
const CORE_ORDER = ["pages", "posts"];

function classify(type: string): { key: string; label: string } {
  if (KNOWN[type]) return KNOWN[type];
  const label = humanize(type) || type;
  // pluralize the auto label lightly
  return { key: type, label: /s$/i.test(label) ? label : label + "s" };
}

export interface CatItem {
  title: string;
  slug: string;
  type: string;
  status: string;
  words: number;
  images: number;
  excerpt: string;
  fields: MetaField[];
}

export interface Category {
  key: string;
  label: string;
  count: number;
  /** core = stock-WP noun; addon = plugin-added (free-form). */
  tier: "core" | "addon";
  items: CatItem[];
}

export interface TreeNode {
  title: string;
  slug: string;
  children: TreeNode[];
}

export interface SiteStructure {
  tree: TreeNode[];
  groups: { label: string; count: number }[];
}

function toItem(p: RecoveredPage): CatItem {
  const excerpt = (p.markdown || "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>*_`\-!\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
  return {
    title: p.title,
    slug: p.slug || p.id,
    type: p.type,
    status: p.status,
    words: p.markdown ? p.markdown.split(/\s+/).filter(Boolean).length : 0,
    images: p.images.length,
    excerpt,
    fields: p.fields,
  };
}

function buildTree(pages: RecoveredPage[]): TreeNode[] {
  interface N extends TreeNode {
    id: string;
    parent: string;
    order: number;
  }
  const nodes = new Map<string, N>();
  for (const p of pages) {
    nodes.set(p.id, {
      id: p.id,
      parent: p.parent,
      order: p.menuOrder,
      title: p.title,
      slug: p.slug || p.id,
      children: [],
    });
  }
  const roots: N[] = [];
  for (const n of nodes.values()) {
    const parent = n.parent && n.parent !== "0" ? nodes.get(n.parent) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  const sort = (arr: N[]) => {
    arr.sort((a, b) => a.order - b.order || (a.title < b.title ? -1 : 1));
    arr.forEach((x) => sort(x.children as N[]));
  };
  sort(roots);
  return roots;
}

export interface Categorized {
  categories: Category[];
  structure: SiteStructure;
  productCount: number;
}

export function categorize(res: RecoverResult): Categorized {
  // Bucket every recovered page by its classified key, remembering label + tier.
  const buckets = new Map<string, { label: string; tier: "core" | "addon"; pages: RecoveredPage[] }>();
  for (const p of res.pages) {
    const { key, label } = classify(p.type);
    const tier = CORE_ORDER.includes(key) ? "core" : "addon";
    let b = buckets.get(key);
    if (!b) {
      b = { label, tier, pages: [] };
      buckets.set(key, b);
    }
    b.pages.push(p);
  }

  // Core buckets in WP order, then free-form buckets alphabetically by label.
  const keys = [...buckets.keys()].sort((a, b) => {
    const ai = CORE_ORDER.indexOf(a);
    const bi = CORE_ORDER.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return buckets.get(a)!.label.localeCompare(buckets.get(b)!.label);
  });

  const categories: Category[] = keys.map((k) => {
    const b = buckets.get(k)!;
    return { key: k, label: b.label, count: b.pages.length, tier: b.tier, items: b.pages.map(toItem) };
  });

  const pagesBucket = buckets.get("pages")?.pages ?? [];
  const structure: SiteStructure = {
    tree: buildTree(pagesBucket),
    groups: [
      ...categories.map((c) => ({ label: c.label, count: c.count })),
      { label: "Comments", count: res.comments.length },
      { label: "Media", count: res.media.length },
      { label: "Products", count: res.productCount },
    ].filter((g) => g.count > 0),
  };

  return { categories, structure, productCount: res.productCount };
}
