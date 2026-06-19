import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works — Unpress",
  description:
    "How Unpress recovers a dead WordPress .wpress backup into clean content and a modern site — entirely in your browser, no WordPress required.",
};

const steps = [
  {
    n: 1,
    title: "Drop your .wpress",
    body: "Drag your All-in-One WP Migration backup onto the page. It's read right here in your browser — the file never uploads to any server. No WordPress, no hosting, no login.",
  },
  {
    n: 2,
    title: "See everything, instantly",
    body: "Unpress reads the backup and lays it out in tabs: your file structure, pages, posts, portfolio, FAQs, media — with your page hierarchy mapped and resized image duplicates stripped away.",
  },
  {
    n: 3,
    title: "Download or rebuild",
    body: "Download every page as clean Markdown + HTML with all your photos in one zip — or rebuild it as a fast, secure, modern Next.js site. Recreated, not replicated.",
  },
];

const recovers = [
  "Pages & posts (published or drafts)",
  "Portfolio, FAQs & testimonials",
  "Original images & media",
  "Page hierarchy & menus",
  "Titles, dates & SEO slugs",
  "Any theme — Avada, Divi, Elementor…",
];

export default function HowItWorks() {
  return (
    <main className="content-page">
      <h1>How Unpress works</h1>
      <p className="lead">
        Your old WordPress site is trapped inside a <code>.wpress</code> backup that nothing can
        open. Unpress sets it free in three steps — without standing WordPress back up.
      </p>

      <div className="steps">
        {steps.map((s) => (
          <div className="step" key={s.n}>
            <span className="num">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>

      <h2>What we recover</h2>
      <p className="lead">
        It doesn&apos;t matter which theme or page builder the site used — we normalize all of it
        into clean, portable content.
      </p>
      <ul className="checks">
        {recovers.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <div className="callout">
        <h3>🔒 Private by design</h3>
        <p>
          Recovery runs entirely in your browser using WebAssembly-grade parsing. Your backup is
          never uploaded, stored, or seen by us — we couldn&apos;t look even if we wanted to.
        </p>
      </div>

      <h2>Ready to see yours?</h2>
      <p className="lead">Drop your backup and watch your content come back to life.</p>
      <p style={{ marginTop: 18 }}>
        <Link
          href="/"
          className="cta primary"
          style={{
            display: "inline-block",
            background: "var(--accent)",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          Recover my site →
        </Link>
      </p>
    </main>
  );
}
