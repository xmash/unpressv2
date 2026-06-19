// Reads the normalized content the Unpress engine produced (theme-agnostic
// Markdown + a site.config.json). Nothing here knows or cares which WordPress
// theme/builder the original site used — the engine already flattened that away.

import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const ROOT = process.cwd();

export interface SiteConfig {
  name: string;
  url: string;
  tagline: string;
  intro: string;
  homeSlug: string;
  hasBlog: boolean;
  nav: { title: string; slug: string }[];
  cards: { title: string; slug: string; excerpt: string }[];
}

export function getConfig(): SiteConfig {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
}

export interface Doc {
  slug: string;
  title: string;
  type: string;
  date: string;
  excerpt: string;
  html: string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function localize(html: string, url: string): string {
  html = html.replace(/(src|href)="media\//g, '$1="/media/');
  if (url) {
    const base = escapeRe(url.replace(/\/$/, ""));
    html = html
      .replace(new RegExp(`href="${base}/([a-z0-9-]+)/?"`, "gi"), 'href="/$1"')
      .replace(new RegExp(`href="${base}/?"`, "gi"), 'href="/"');
  }
  return html;
}

function parse(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v: string = kv[2].trim();
    try {
      v = JSON.parse(v);
    } catch {
      /* keep raw */
    }
    meta[kv[1]] = v;
  }
  return { meta, body: m[2] };
}

function readDir(type: "pages" | "posts"): Doc[] {
  const dir = path.join(ROOT, "content", type);
  if (!fs.existsSync(dir)) return [];
  const url = getConfig().url;
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { meta, body } = parse(fs.readFileSync(path.join(dir, f), "utf8"));
      const html = localize(marked.parse(body, { async: false }) as string, url);
      return {
        slug: meta.slug || f.replace(/\.md$/, ""),
        title: meta.title || "Untitled",
        type: meta.type || type,
        date: meta.date || "",
        excerpt: meta.excerpt || "",
        html,
      };
    });
}

export function listDocs(type: "pages" | "posts"): Doc[] {
  const docs = readDir(type);
  if (type === "posts") docs.sort((a, b) => (a.date < b.date ? 1 : -1));
  return docs;
}

export function getDoc(type: "pages" | "posts", slug: string): Doc | null {
  return readDir(type).find((d) => d.slug === slug) || null;
}
