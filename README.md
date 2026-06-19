# Unpress

**Your website, set free.** Drop in an old WordPress `.wpress` backup (All-in-One WP
Migration) and get your content + photos back — instantly, in your browser. Your file
never leaves your computer.

> Re-creation, not replication. The theme is disposable; the content is the asset.
> See [PRODUCT-BRIEF.md](./PRODUCT-BRIEF.md) for positioning, pricing, and roadmap, and
> the build plan at `~/.claude/plans/wondrous-sauteeing-sky.md`.

## Why this exists

Every other tool assumes a **live** WordPress: `.wpress` extractors stop at "here are your
files"; Markdown exporters need WordPress running to produce a WXR export; headless
starters need WordPress serving an API. Nobody bridges a **dead** `.wpress` backup →
usable content → modern site. Unpress is that bridge.

## What's built (MVP)

- **`src/engine/`** — the Recover engine, a DOM-free TypeScript module that runs identically
  in Node and in a browser Web Worker:
  - `wpress.ts` — reads the `.wpress` block format (4377-byte headers).
  - `sql.ts` — minimal MySQL-dump reader (pulls rows from `INSERT` statements).
  - `content.ts` — de-shortcodes Fusion/Avada + Gutenberg + Classic HTML → clean
    HTML + Markdown, rewrites media URLs to local paths. No DOM dependency.
  - `recover.ts` — orchestrates: `.wpress` bytes → site info, pages/posts, media, inventory.
- **`bin/recover.ts`** — Node CLI. `npm run recover -- <file.wpress> [outDir] [--drafts]` → a
  folder + `unpress-recovery.zip` (Markdown + HTML per page, original images, `inventory.json`).
  Published only by default; drafts/private are opt-in and routed to separate folders.
- **`src/rebuild/`** + **`bin/rebuild.ts`** — the Rebuild ("rebirth"): recovered published
  content → a clean, modern, self-contained **static site** (home, nav, per-page, articles
  index, media, CSS, localized internal links). `npm run rebuild -- <file.wpress> [outDir]`.
- **`src/app/`** — the "Google homepage" Next.js app: one dropzone, runs the engine in a
  Web Worker (nothing uploads), previews recovered content, and a Download button.

## Defaults that keep the output clean

- **Published only** by default (drafts/pending/junk excluded; drafts opt-in via `--drafts`).
- **Original media only** — WordPress's resized variants (`-150x150`, `-scaled`, …) are
  dropped and content URLs rewritten to the originals, so nothing breaks.

## Proven on real data (Alicance)

`241 MB .wpress` → **Alicance Data Centers**: 17 pages, 14 posts, 429 images. Content
de-shortcodes to clean Markdown; **54/54 image references resolve** to recovered files.

## Run it

```bash
npm install

# Headless: recover any .wpress to a folder + zip
npm run recover -- ./some-site.wpress recovered-some-site

# The web app
npm run dev      # http://localhost:3000
npm run build && npm run start
```

## Not yet built (next phases)

Rebuild-into-modern-site (fork `next-wp` shell fed by the engine's JSON), paid export
tiers + billing, agency bulk/API, marketing/SEO pages.
