import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — Unpress",
  description:
    "Unpress keeps cookies to a minimum — no advertising or cross-site tracking. Here's exactly what we use.",
};

const UPDATED = "June 22, 2026";

export default function CookiePolicy() {
  return (
    <main className="legal-page">
      <section className="section">
        <h1 className="section-title">Cookie Policy</h1>
        <p className="lp-meta">Last updated: {UPDATED}</p>

        <p className="lp-lead">
          We keep cookies and local storage to the bare minimum needed to run Unpress.{" "}
          <strong>No advertising cookies, no cross-site tracking, no data selling.</strong>
        </p>

        <h2 className="lp-h2">What we use</h2>
        <ul className="lp-ul">
          <li>
            <strong>Essential on-device storage</strong> — a small counter in your browser&apos;s local
            storage tracks your free daily recoveries and remembers a recently-processed file so a
            re-drop is instant. It lives on your device and is never sent to us.
          </li>
          <li>
            <strong>Payment cookies</strong> — when you check out, <strong>Stripe</strong> and{" "}
            <strong>PayPal</strong> set their own cookies to process the payment securely and prevent
            fraud. These are governed by their cookie policies, not ours.
          </li>
        </ul>

        <h2 className="lp-h2">What we don&apos;t use</h2>
        <p>
          No advertising or retargeting cookies, no affiliate trackers, and no analytics that profile
          you across other sites. If we ever add privacy-friendly analytics, we&apos;ll update this page
          first.
        </p>

        <h2 className="lp-h2">Managing cookies</h2>
        <p>
          You can clear or block cookies in your browser settings. Blocking the payment processors&apos;
          cookies will prevent checkout from working, but everything else — recovering and previewing
          your site — runs entirely in your browser regardless.
        </p>

        <h2 className="lp-h2">Contact</h2>
        <p>
          Questions about cookies? Email{" "}
          <a href="mailto:legal@wpunpress.com">legal@wpunpress.com</a>.
        </p>
      </section>
    </main>
  );
}
