import type { Handler } from "@netlify/functions";
import { json, parseBody, paypalBase, paypalToken } from "./_lib";

// Captures (charges) an approved PayPal order. Source of truth for entitlement.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const orderId = parseBody(event.body).orderId;
  if (typeof orderId !== "string") return json(400, { error: "Missing orderId" });
  try {
    const token = await paypalToken();
    const res = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    });
    const data = (await res.json()) as { status?: string };
    return json(200, { paid: data.status === "COMPLETED" });
  } catch (err) {
    return json(503, { error: err instanceof Error ? err.message : "PayPal not configured" });
  }
};
