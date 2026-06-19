// Rebuild ("rebirth"): recover a .wpress's published content, then emit a
// standalone, runnable Next.js project by copying the universal template and
// filling it with normalized Markdown + media + a site config. Theme-agnostic —
// it never inspects which WordPress builder the original used.

import fs from "node:fs";
import path from "node:path";
import { recover } from "../engine/index";
import type { RecoveredPage } from "../engine/recover";

const slugOf = (p: RecoveredPage) => p.slug || p.id;

function excerpt(p: RecoveredPage): string {
  const t = (p.markdown || "")
    .replace(/https?:\/\/\S+/g, " ") // drop raw URLs
    .replace(/[#>*_`\-!\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.slice(0, 150) + (t.length > 150 ? "…" : "");
}

// Derive a hero headline + intro from the home page's text (any theme).
function heroFrom(home: RecoveredPage | undefined): { tagline: string; intro: string } {
  if (!home) return { tagline: "", intro: "" };
  const lines = (home.markdown || "")
    .split("\n")
    .map((l) =>
      l
        .replace(/^[#>\-*+\s]+/, "") // leading markdown markers (#, >, -, *, +)
        .replace(/[*_`\[\]()]/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .trim(),
    )
    .filter((l) => l.length > 0);
  let tagline = "";
  let intro = "";
  for (const l of lines) {
    if (!tagline && l.length > 8) tagline = l;
    else if (tagline && !intro && l.length > 30) {
      intro = l;
      break;
    }
  }
  return { tagline: tagline.slice(0, 90), intro: intro.slice(0, 180) };
}

function mdFile(p: RecoveredPage): string {
  return [
    "---",
    `title: ${JSON.stringify(p.title)}`,
    `slug: ${JSON.stringify(slugOf(p))}`,
    `type: ${p.type}`,
    `date: ${JSON.stringify(p.date)}`,
    `excerpt: ${JSON.stringify(excerpt(p))}`,
    "---",
    "",
    p.markdown || "",
    "",
  ].join("\n");
}

export interface RebirthStats {
  name: string;
  pages: number;
  posts: number;
  media: number;
}

export function generate(bytes: Uint8Array, outDir: string, templateDir: string): RebirthStats {
  const res = recover(bytes, { statuses: ["publish"] });

  // Fresh copy of the template.
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.cpSync(templateDir, outDir, { recursive: true });

  const pages = res.pages.filter((p) => p.type === "page");
  const posts = res.pages.filter((p) => p.type === "post");

  const pagesDir = path.join(outDir, "content", "pages");
  const postsDir = path.join(outDir, "content", "posts");
  fs.mkdirSync(pagesDir, { recursive: true });
  fs.mkdirSync(postsDir, { recursive: true });
  for (const p of pages) fs.writeFileSync(path.join(pagesDir, `${slugOf(p)}.md`), mdFile(p));
  for (const p of posts) fs.writeFileSync(path.join(postsDir, `${slugOf(p)}.md`), mdFile(p));

  for (const m of res.media) {
    const dest = path.join(outDir, "public", m.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, m.data);
  }

  const home = pages.find((p) => slugOf(p) === "home") || pages[0];
  const homeSlug = home ? slugOf(home) : "";
  const { tagline, intro } = heroFrom(home);

  const navPages = pages
    .filter((p) => (!p.parent || p.parent === "0") && slugOf(p) !== homeSlug)
    .sort((a, b) => a.menuOrder - b.menuOrder)
    .slice(0, 7);

  const config = {
    name: res.site.name,
    url: res.site.url,
    tagline: tagline || res.site.name,
    intro: intro || res.site.description || "",
    homeSlug,
    hasBlog: posts.length > 0,
    nav: navPages.map((p) => ({ title: p.title, slug: slugOf(p) })),
    cards: navPages
      .filter((p) => !/contact|legal|policy|terms|cookie|privacy/i.test(slugOf(p)))
      .map((p) => ({ title: p.title, slug: slugOf(p), excerpt: excerpt(p) })),
  };
  fs.writeFileSync(path.join(outDir, "site.config.json"), JSON.stringify(config, null, 2));

  return { name: res.site.name, pages: pages.length, posts: posts.length, media: res.media.length };
}
