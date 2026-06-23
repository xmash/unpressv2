import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — Unpress",
  description:
    "The terms governing your use of Unpress, including the one-time purchase and no-refund policy for instant digital downloads.",
};

const UPDATED = "June 22, 2026";

export default function Terms() {
  return (
    <main className="legal-page">
      <section className="section">
        <h1 className="section-title">Terms of Use</h1>
        <p className="lp-meta">Last updated: {UPDATED} · Version 1.0</p>

        <p className="lp-lead">
          Unpress is operated by <strong>Redcloud Systems LLC</strong> (Colorado, United States). By
          using Unpress you agree to these terms. You must be at least 18 years old. If you
          don&apos;t agree, please don&apos;t use the service.
        </p>

        <h2 className="lp-h2">1. What Unpress does</h2>
        <p>
          Unpress reads a WordPress backup you provide and recovers its content — entirely inside your
          browser. The preview is free; a one-time payment unlocks the full export. Results depend on
          the contents and integrity of your backup.
        </p>

        <h2 className="lp-h2">2. Your responsibilities</h2>
        <ul className="lp-ul">
          <li>You must own, or have permission to process, any backup you use with Unpress.</li>
          <li>You won&apos;t use Unpress to recover or distribute unlawful, infringing, or harmful content.</li>
          <li>You won&apos;t attempt to abuse, overload, reverse-engineer, or circumvent the service or its limits.</li>
          <li>You are responsible for keeping your own copies of your data.</li>
        </ul>

        <h2 className="lp-h2">3. Purchases &amp; pricing</h2>
        <p>
          The full site export is a one-time purchase of $19 per site; the WooCommerce store export is
          an additional $19.99. Prices are shown before you pay and may change over time. You are
          responsible for any applicable taxes. Payments are processed by Stripe and PayPal.
        </p>

        <h2 className="lp-h2">4. Refund policy — all sales are final</h2>
        <p>
          The export is a <strong>digital product delivered instantly</strong> at the moment of
          payment. For that reason <strong>all sales are final and non-refundable.</strong> You confirm
          you understand this at checkout before paying. The only exception: if a technical fault on our
          side prevents your download from being delivered, contact us and we&apos;ll fix it or refund
          that purchase.
        </p>

        <h2 className="lp-h2">5. &ldquo;As is&rdquo; — no warranty</h2>
        <p>
          Unpress is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of
          any kind. We don&apos;t guarantee that every backup will recover completely or that the output
          will be error-free — recovery quality depends on your backup. We provide no obligation of
          support or maintenance.
        </p>

        <h2 className="lp-h2">6. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, Unpress and its suppliers will not be liable for any
          indirect, incidental, or consequential damages, or any loss of data or profits, arising from
          your use of the service. Our total liability for any claim is limited to the amount you paid
          us in the past twelve months.
        </p>

        <h2 className="lp-h2">7. Intellectual property</h2>
        <p>
          Unpress (the software, brand, and site) is owned by Redcloud Systems LLC. The content you
          recover from your own backup belongs to you — we claim no rights over it.
        </p>

        <h2 className="lp-h2">8. Changes &amp; termination</h2>
        <p>
          We may change, suspend, or discontinue the service, and may update these terms; material
          changes will be posted here with a new date. Continued use after changes means you accept them.
        </p>

        <h2 className="lp-h2">9. Governing law &amp; contact</h2>
        <p>
          These terms are governed by the laws of the State of Colorado, United States. Questions?
          Email <a href="mailto:legal@wpunpress.com">legal@wpunpress.com</a>.
        </p>
      </section>
    </main>
  );
}
