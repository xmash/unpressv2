# Unpress — Product Brief

> **Your website, set free.**
> Drop in your old WordPress backup. Get your content — and a live, modern site — back. No WordPress. No developers. Your files never leave your computer.

---

## 1. The problem (in the customer's words)

> *"My old host shut down / my developer disappeared / I cancelled hosting — and all I have left is this `.wpress` file. I tried to open it with WinZip and it's broken. The free plugin won't take it because it's too big. The 'online extractors' want me to upload my entire website to some random server. I just want my site back."*

`.wpress` is the **proprietary backup format** of the All-in-One WP Migration plugin (5M+ installs). It's everywhere, and it's a trap for non-technical owners:

| Wall they hit | Reality |
|---|---|
| **It won't open** | Not a real ZIP — 7-Zip / WinRAR / "rename to .zip" all fail. It's a custom block format. |
| **The plugin won't take it** | Free tier import cap is ~**100 MB** (host-imposed). Real sites are 200 MB–2 GB. Pushed to the **$69 "Unlimited" extension** or php.ini hacks they can't do. |
| **Online tools are scary** | Existing browser extractors require **uploading the entire site to a stranger's server**. No privacy guarantee. |
| **The dev tools are dev-only** | npm CLIs, Go binaries, GitHub releases. Filters out 95% of real owners. |
| **Even if extracted — then what?** | You get a folder of PHP and a `.sql` file. A normal person still can't make a website out of that. |

**Nobody owns the lane:** *"I'm not technical, I have this file, I just want my content and a working site back — safely."*

---

## 2. The product

A single, calm web app with one job: **turn an orphaned WordPress backup into something useful.**

### Three things it does, in order of value

1. **Open it** *(free, in-browser)* — Drag the `.wpress` (or `.zip`/`.sql`) in. We parse it **locally in the browser (WASM)** — the file never uploads. Instantly see: every page, post, image, menu, and setting, as a clean readable inventory.
2. **Get it out** *(Rescue)* — Export clean content: Markdown + media ZIP, a full **SEO + redirect map** (old URLs → new), and a structured `inventory.json`. Everything you need to move anywhere.
3. **Bring it back** *(Revive)* — One click generates a **live, modern static/Next.js site** from the backup — fast, secure, no WordPress to maintain — hosted for you on a free subdomain or your own domain.

### The killer differentiator: **privacy by architecture**

Extraction runs **client-side (WebAssembly)**. The backup never touches our servers for the free "open & preview" step. That single fact destroys the only objection to every existing online extractor. "We *can't* see your data, even if we wanted to."

---

## 3. Who buys it (ICPs)

| Segment | Trigger | What they pay for | $ |
|---|---|---|---|
| **Stranded site owner** (primary, emotional) | Host shut down, only has the file | Get content + a live site back without learning anything | $$ |
| **Small biz / solopreneur** | Wants off WordPress (slow, hacked, costly) onto something modern | "Revive" → fast static site, no more updates/plugins/breaches | $$$ |
| **Freelancers & agencies** (highest LTV) | Migrating client sites in bulk | Bulk extraction, API, redirect maps, white-label, time saved | $$$$ |
| **Devs** (wedge / credibility) | Need the content out, fast | Clean `inventory.json` + media, CLI/API | $ |

The agency lane is the real revenue (this is literally *our own* use case — a folder of 16 `.wpress` files to migrate). The stranded owner is the **SEO + emotional wedge** that brings the traffic.

---

## 4. Go-to-market: ride the search intent that already exists

People are **already Googling the pain** in huge volume:
`how to open a wpress file` · `extract wpress without wordpress` · `wpress file too big to import` · `all in one wp migration upload limit` · `convert wpress to zip`.

- **SEO-first.** The landing site is built as the definitive, trustworthy answer to those exact queries (FAQ + guides). We out-rank the sketchy extractors on *safety*.
- **Free tool = lead magnet.** "Open it" is free and genuinely useful → captures the searcher at peak intent → upsell Rescue/Revive.
- **Programmatic SEO.** "/how-to-open-a-wpress-file", "/wpress-too-big-to-import", "/migrate-wordpress-to-nextjs", one page per pain.
- **Agency outreach** once the engine is proven on real sites.

---

## 5. Pricing

| Tier | Price | What you get |
|---|---|---|
| **Open** | Free | In-browser extraction + full content preview/inventory. Download `inventory.json`. |
| **Rescue** | **$39 / site** (one-time) | Full content export (Markdown + media ZIP), SEO + redirect map, all settings. *Undercuts the $69 plugin and does more.* |
| **Revive** | **$149 / site** one-time, or **$15/mo** hosted | Generated live modern site (static/Next.js) from the backup, deployed + custom domain. |
| **Agency** | **$79/mo** or per-pack | Bulk uploads, API, white-label reports, priority. Built for the 16-sites-at-once reality. |

Anchored against: free plugin + **$69** extension, online extractors (free but unsafe), and **$500–$5,000** done-for-you migration agencies. Unpress sits in the empty middle: *cheaper than an agency, safer and more complete than DIY.*

---

## 6. Competitive map

| | Opens big files | No WordPress needed | Private (no upload) | Non-techie friendly | Gives you a *working site* | Price |
|---|---|---|---|---|---|---|
| AIO WP Migration (plugin) | Paid only | ❌ needs WP | ✅ | ⚠️ | ❌ (just restores WP) | $69 |
| Online extractors | ⚠️ limited | ✅ | ❌ **uploads everything** | ✅ | ❌ | Free |
| GitHub CLI/GUI tools | ✅ | ✅ | ✅ | ❌ | ❌ | Free |
| Migration agency | ✅ | ✅ | ✅ | ✅ | ✅ | $$$$ |
| **Unpress** | ✅ | ✅ | ✅ **in-browser** | ✅ | ✅ | $0–$149 |

---

## 7. Build roadmap

- **Phase 0 — Online presence** *(this build)*: marketing site, copy, SEO foundation, pricing, the Alicance before/after proof, waitlist/email capture.
- **Phase 1 — "Open it"**: in-browser WASM `.wpress` parser → live inventory view. (Engine already prototyped — Alicance extracted: 7,987 files, 206 MB.)
- **Phase 2 — "Get it out"**: Markdown + media export, redirect/SEO map, `inventory.json`.
- **Phase 3 — "Bring it back"**: backup → Next.js/static generator + one-click deploy.
- **Phase 4 — Agency**: bulk, API, white-label.

---

## 8. Why we'll win

1. **Privacy is a moat, not a feature** — in-browser extraction is something the scared searcher *can't get anywhere else*.
2. **We finish the job** — everyone else stops at "here's a folder of files." We hand back a *working site*.
3. **We're our own first customer** — 16 real `.wpress` files to migrate. The engine gets battle-tested on Alicance and 15 siblings before we charge a stranger.
4. **The demand is already searching** — we don't create the need, we rank for it.
