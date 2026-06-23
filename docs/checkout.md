# Checkout — Stripe + PayPal

Payments are handled by **Netlify Functions** (`frontend/netlify/functions`). The
parsing stays 100% in the browser — the functions only ever see prices and order
ids, never the backup.

## Flow (no redirect, so the in-browser recovery isn't lost)

1. User clicks **Download — $19** → `CheckoutModal` opens.
2. **Stripe:** `create-stripe-session` makes an *embedded* Checkout Session
   (`ui_mode: embedded`, `redirect_on_completion: never`). On completion,
   `verify-stripe` confirms `payment_status === "paid"`.
   **PayPal:** `create-paypal-order` → buttons → `capture-paypal-order` confirms
   `status === "COMPLETED"`.
3. On a verified payment → `entitled = true` → the worker (still holding the
   parse) builds the zip and the download fires.

Entitlement is ephemeral (one-time instant download) — no accounts/DB needed.

## Going live

Set these env vars in **Netlify → Site settings → Environment variables** (and
in `frontend/.env.local` for local testing). `NEXT_PUBLIC_*` are build-time and
exposed to the browser; the rest are function-only secrets.

| Var | Where | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | `pk_live_…` (or `pk_test_…`) |
| `STRIPE_SECRET_KEY` | secret | `sk_live_…` (or `sk_test_…`) |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | public | PayPal app client id |
| `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` | secret | same app's credentials |
| `PAYPAL_ENV` | secret | `sandbox` or `live` |

Missing keys degrade gracefully — the modal shows "payments aren't configured"
and only the configured method(s) appear.

## Local testing

`next dev` does NOT run the Netlify functions. To test checkout end-to-end
locally use the Netlify CLI:

```
npm i -g netlify-cli
cd frontend && netlify dev      # serves the app + functions, injects env
```

Use Stripe/PayPal **test** keys, pay with a test card (`4242 4242 4242 4242`) or
a PayPal sandbox account, and the download should fire on success.

## Prices

In `frontend/netlify/functions/_lib.ts`: site `1900`¢, store add-on `1999`¢.
The store add-on charges correctly but product *content* isn't recovered yet
(products stay gated in the engine) — wire that before selling the store tier.
