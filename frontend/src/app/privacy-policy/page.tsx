import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Unpress",
  description:
    "How Unpress handles your data. Your backup is processed entirely in your browser and is never uploaded to us.",
};

const UPDATED = "June 22, 2026";

export default function PrivacyPolicy() {
  return (
    <main className="legal-page">
      <section className="section">
        <h1 className="section-title">Privacy Policy</h1>
        <p className="lp-meta">Last updated: {UPDATED}</p>

        <p className="lp-lead">
          Unpress is operated by <strong>Redcloud Systems LLC</strong> (Colorado, United States).
          Privacy isn&apos;t a feature we bolt on — it&apos;s how Unpress works.{" "}
          <strong>
            Your backup file and everything recovered from it are processed entirely inside your own
            browser and are never uploaded to us.
          </strong>{" "}
          We can&apos;t see your file or its contents, because they never reach our servers.
        </p>

        <h2 className="lp-h2">Information we process</h2>
        <ul className="lp-ul">
          <li>
            <strong>Your backup &amp; recovered content</strong> — read and processed locally in your
            browser (in a Web Worker). It is never transmitted to us. We have no access to it and store
            none of it.
          </li>
          <li>
            <strong>Payment information</strong> — when you buy an export, payment is handled by{" "}
            <strong>Stripe</strong> and <strong>PayPal</strong>. We never receive or store your card
            details; we only receive confirmation that a payment succeeded plus an order/session id.
          </li>
          <li>
            <strong>Technical logs</strong> — our host (Netlify) keeps standard server logs (IP
            address, browser type, timestamps) for the site and the payment functions, used for
            security and abuse prevention.
          </li>
          <li>
            <strong>On-device storage</strong> — we keep a small rate-limit counter in your
            browser&apos;s local storage to enforce the free daily limit. It stays on your device.
          </li>
          <li>
            <strong>Messages you send us</strong> — if you email us, we receive what you choose to send.
          </li>
        </ul>

        <h2 className="lp-h2">What we do not do</h2>
        <ul className="lp-ul">
          <li>We do not sell or rent your personal data.</li>
          <li>We do not serve ads or run third-party advertising / affiliate trackers.</li>
          <li>We do not require an account to recover or download your site.</li>
        </ul>

        <h2 className="lp-h2">Your rights (GDPR &amp; CCPA)</h2>
        <p>
          You have the right to access, correct, erase, restrict, object to, or port your personal
          data, and the right not to have personal data sold (we don&apos;t sell it). Because we never
          receive your backup content, those requests apply only to the limited data above (logs,
          payment records, correspondence). To exercise any right, contact us and we&apos;ll respond
          within one month.
        </p>

        <h2 className="lp-h2">Retention</h2>
        <p>
          We never receive your backup content, so there is nothing to retain. Server logs are kept for
          a limited period for security. Payment records are retained as required for tax and accounting.
        </p>

        <h2 className="lp-h2">Processors</h2>
        <p>
          We rely on Stripe and PayPal (payments) and Netlify (hosting). Each has its own privacy
          policy governing the data it handles.
        </p>

        <h2 className="lp-h2">Children</h2>
        <p>
          Unpress is not directed to children under 13 and we do not knowingly collect their data.
        </p>

        <h2 className="lp-h2">Changes &amp; contact</h2>
        <p>
          We may update this policy; material changes will be posted here with a new date. Questions?
          Email <a href="mailto:legal@wpunpress.com">legal@wpunpress.com</a>.
        </p>
      </section>
    </main>
  );
}
