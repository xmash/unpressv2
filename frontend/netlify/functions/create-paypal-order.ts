import type { Handler } from "@netlify/functions";
import { json, parseBody, paypalBase, paypalToken, totalUsd } from "./_lib";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const store = parseBody(event.body).store === true;
  try {
    const token = await paypalToken();
    const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: store ? "Unpress site recovery + store export" : "Unpress site recovery",
            amount: { currency_code: "USD", value: totalUsd(store) },
          },
        ],
      }),
    });
    const data = (await res.json()) as { id?: string };
    if (!data.id) return json(502, { error: "PayPal order failed" });
    return json(200, { id: data.id });
  } catch (err) {
    return json(503, { error: err instanceof Error ? err.message : "PayPal not configured" });
  }
};
