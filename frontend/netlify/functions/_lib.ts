// Shared helpers for the payment functions. Files prefixed with "_" are not
// treated as deployable functions by Netlify. NOTE: these endpoints only ever
// see prices and order ids — never the user's backup, which stays in the browser.

export const PRICE = {
  // Stripe wants cents; PayPal wants dollar strings.
  siteCents: 1900,
  storeCents: 1999,
  siteUsd: "19.00",
  storeUsd: "19.99",
};

export function totalCents(store: boolean) {
  return PRICE.siteCents + (store ? PRICE.storeCents : 0);
}
export function totalUsd(store: boolean) {
  return (totalCents(store) / 100).toFixed(2);
}

export function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

export function parseBody(raw: string | null): Record<string, unknown> {
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// ---- PayPal REST ----
const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export function paypalBase() {
  return PAYPAL_BASE;
}

export async function paypalToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!id || !secret) throw new Error("PayPal not configured");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("PayPal auth failed");
  return data.access_token;
}
