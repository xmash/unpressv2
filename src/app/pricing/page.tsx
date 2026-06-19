import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Unpress",
  description:
    "Unpress pricing — recover and download your WordPress content free. Upgrade to Pro for WooCommerce recovery and one-click modern-site rebuilds.",
};

const tiers = [
  {
    tag: "",
    name: "Free",
    price: "$0",
    unit: "forever",
    desc: "Everything you need to get your content and photos back.",
    features: [
      "Recover any .wpress in your browser",
      "Pages, posts, portfolio, FAQs & media",
      "Download Markdown + HTML + photos (.zip)",
      "File-structure & content inventory",
      "100% private — nothing is uploaded",
    ],
    cta: "Recover free",
    href: "/",
    primary: false,
    featured: false,
  },
  {
    tag: "Most popular",
    name: "Pro",
    price: "$19",
    unit: "/ month",
    desc: "Rebuild a living site and recover stores, not just files.",
    features: [
      "Everything in Free",
      "One-click rebuild into a modern Next.js site",
      "WooCommerce store & catalog recovery",
      "Drafts, revisions & private content",
      "Custom domain & hosting hand-off",
      "Priority email support",
    ],
    cta: "Start Pro",
    href: "/",
    primary: true,
    featured: true,
  },
  {
    tag: "",
    name: "Agency",
    price: "$79",
    unit: "/ month",
    desc: "For freelancers and studios migrating sites in bulk.",
    features: [
      "Everything in Pro",
      "Bulk / batch recovery & rebuilds",
      "API access & CLI",
      "White-label reports",
      "Unlimited sites",
    ],
    cta: "Talk to us",
    href: "/",
    primary: false,
    featured: false,
  },
];

export default function Pricing() {
  return (
    <main className="content-page">
      <h1>Simple pricing</h1>
      <p className="lead">
        Recovering your content is free — forever. Pay only when you want Unpress to rebuild a live
        site or bring back a store.
      </p>

      <div className="pricing">
        {tiers.map((t) => (
          <div className={`ptier ${t.featured ? "featured" : ""}`} key={t.name}>
            <span className="tag">{t.tag}</span>
            <h3>{t.name}</h3>
            <div className="price">
              {t.price} <small>{t.unit}</small>
            </div>
            <p className="desc">{t.desc}</p>
            <ul>
              {t.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link href={t.href} className={`cta ${t.primary ? "primary" : ""}`}>
              {t.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="callout" style={{ marginTop: 40 }}>
        <h3>Why is recovery free?</h3>
        <p>
          Because it runs entirely in your browser — there&apos;s no server cost for us, and no
          privacy cost for you. We only charge when we do the heavy lifting: rebuilding a live
          modern site or recovering a WooCommerce store.
        </p>
      </div>
    </main>
  );
}
