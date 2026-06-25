import Link from "next/link";
import type { Metadata } from "next";
import { PREVIEW, FREE_TIER } from "../../lib/limits";

export const metadata: Metadata = {
  title: "Limits & Pricing — Unpress",
  description:
    "What the free preview shows, daily recovery limits, file-size limits, and pricing. Simple limits — the preview proves recovery without giving away your content.",
};

const GB = FREE_TIER.maxBytes / 1024 ** 3;

const tiers = [
  { name: "Anonymous", parses: `${FREE_TIER.parsesPerDay} / day`, size: `${GB} GB`, note: "Enough to evaluate, not to abuse." },
  { name: "Registered", parses: "10 / day", size: "10 GB", note: "Simple email sign-up.", soon: true },
  { name: "Paid", parses: "Unlimited", size: "50 GB", note: "Already showed willingness to pay.", soon: true },
];

export default function LimitsPage() {
  return (
    <main className="legal-page">
      <section className="section">
        <h1 className="section-title">Limits &amp; pricing</h1>
        <p className="section-lead">
          Simple limits. The free preview reveals just enough to prove your site recovered — without
          giving away the content. The export gives you <strong>everything</strong>: no
          partial exports, no watermarks, no crippleware.
        </p>

        {/* preview */}
        <h2 className="lp-h2">What the free preview shows</h2>
        <div className="ftable-wrap">
          <table className="ftable">
            <thead>
              <tr><th>Content</th><th>Preview shows</th><th>Export</th></tr>
            </thead>
            <tbody>
              <tr><td>Site statistics</td><td>All counts (pages, posts, products, comments, images)</td><td>—</td></tr>
              <tr><td>Pages</td><td>First {PREVIEW.pages}</td><td>Every page</td></tr>
              <tr><td>Posts</td><td>First {PREVIEW.posts}</td><td>Every post</td></tr>
              <tr><td>Other content (jobs, lessons, events…)</td><td>First {PREVIEW.items} of each</td><td>All of it</td></tr>
              <tr><td>Images</td><td>{PREVIEW.images} thumbnails</td><td>All originals</td></tr>
              <tr><td>Comments</td><td>First {PREVIEW.comments}</td><td>All, attached to posts</td></tr>
              <tr><td>WooCommerce</td><td>{PREVIEW.items} sample product names — no pricing, no inventory</td><td>Products, variations, prices, SKUs &amp; categories</td></tr>
            </tbody>
          </table>
        </div>

        {/* tiers */}
        <h2 className="lp-h2">Recovery &amp; file-size limits</h2>
        <p className="muted-note mb">
          Limits are per browser. Re-recovering the <em>same</em> file within 30 minutes is free and
          doesn&apos;t count against your daily total.
        </p>
        <div className="ftable-wrap">
          <table className="ftable">
            <thead>
              <tr><th>Tier</th><th>Recoveries / day</th><th>Max file size</th><th></th></tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.name}>
                  <td><strong>{t.name}</strong>{t.soon && <span className="free-pill" style={{ marginLeft: 8 }}>soon</span>}</td>
                  <td>{t.parses}</td>
                  <td>{t.size}</td>
                  <td>{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* pricing */}
        <h2 className="lp-h2">Pricing</h2>
        <div className="ftable-wrap">
          <table className="ftable">
            <thead>
              <tr><th>Plan</th><th>Price</th><th>What you get</th></tr>
            </thead>
            <tbody>
              <tr><td>Preview</td><td>Free</td><td>See everything counted, sample of each, site structure &amp; statistics</td></tr>
              <tr><td>Recover</td><td>$19 / site</td><td>Full export — every page &amp; post (Markdown + HTML), all images, comments, inventory</td></tr>
              <tr><td>Store add-on</td><td>+$59 / store</td><td>WooCommerce products, variations, prices, SKUs, categories &amp; metadata</td></tr>
            </tbody>
          </table>
        </div>
        <p className="ftable-foot">
          Multi-site backups (a host/reseller archive with many sites) preview every site free; you
          pay $19 only for the ones you export.
        </p>

        <div className="lp-cta">
          <Link href="/#recover" className="btn-primary big">Recover my site →</Link>
        </div>
      </section>
    </main>
  );
}
