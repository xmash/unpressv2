// Groups recovered content into the tabbed categories the app shows
// (Pages, Posts, Portfolio, FAQs, …) and builds a site-structure tree.
// WooCommerce products are surfaced only as a locked/paid count.

import type { RecoverResult, RecoveredPage } from "./recover";

const PORTFOLIO = new Set(["portfolio", "avada_portfolio", "jetpack-portfolio", "project"]);
const FAQ = new Set(["avada_faq", "faq", "sp_faq", "fusion_faq", "ufaq"]);
const TESTIMONIAL = new Set(["testimonial", "avada_testimonial"]);

export type CategoryKey = "pages" | "posts" | "portfolio" | "faqs" | "testimonials";

export interface CatItem {
  title: string;
  slug: string;
  type: string;
  status: string;
  words: number;
  images: number;
  excerpt: string;
}

export interface Category {
  key: CategoryKey;
  label: string;
  count: number;
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

function bucketOf(type: string): CategoryKey {
  if (type === "page") return "pages";
  if (PORTFOLIO.has(type)) return "portfolio";
  if (FAQ.has(type)) return "faqs";
  if (TESTIMONIAL.has(type)) return "testimonials";
  return "posts";
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

const LABELS: Record<CategoryKey, string> = {
  pages: "Pages",
  posts: "Posts",
  portfolio: "Portfolio",
  faqs: "FAQs",
  testimonials: "Testimonials",
};
const ORDER: CategoryKey[] = ["pages", "posts", "portfolio", "faqs", "testimonials"];

export interface Categorized {
  categories: Category[];
  structure: SiteStructure;
  productCount: number;
}

export function categorize(res: RecoverResult): Categorized {
  const groups: Record<CategoryKey, RecoveredPage[]> = {
    pages: [], posts: [], portfolio: [], faqs: [], testimonials: [],
  };
  for (const p of res.pages) groups[bucketOf(p.type)].push(p);

  const categories: Category[] = ORDER.filter((k) => groups[k].length > 0).map((k) => ({
    key: k,
    label: LABELS[k],
    count: groups[k].length,
    items: groups[k].map(toItem),
  }));

  const structure: SiteStructure = {
    tree: buildTree(groups.pages),
    groups: [
      { label: "Pages", count: groups.pages.length },
      { label: "Posts", count: groups.posts.length },
      { label: "Portfolio", count: groups.portfolio.length },
      { label: "FAQs", count: groups.faqs.length },
      { label: "Testimonials", count: groups.testimonials.length },
      { label: "Media", count: res.media.length },
      { label: "Products (locked)", count: res.productCount },
    ].filter((g) => g.count > 0),
  };

  return { categories, structure, productCount: res.productCount };
}
