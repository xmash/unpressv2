import type { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { json, parseBody } from "./_lib";

// Server-side confirmation that a Stripe session was actually paid. Never trust
// the client for entitlement — this is the source of truth.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json(503, { error: "Stripe is not configured." });

  const sessionId = parseBody(event.body).sessionId;
  if (typeof sessionId !== "string") return json(400, { error: "Missing sessionId" });

  const stripe = new Stripe(key);
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    return json(200, {
      paid: s.payment_status === "paid",
      store: s.metadata?.store === "1",
    });
  } catch (err) {
    return json(502, { error: err instanceof Error ? err.message : "Stripe error" });
  }
};
