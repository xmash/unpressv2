"use client";

import { useCallback, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

const FN = "/.netlify/functions";

export default function CheckoutModal({
  sitePrice,
  storePrice,
  productCount,
  initialStore = false,
  onPaid,
  onClose,
}: {
  sitePrice: number;
  storePrice: number;
  productCount: number;
  initialStore?: boolean;
  onPaid: () => void;
  onClose: () => void;
}) {
  const hasStripe = Boolean(STRIPE_PK);
  const hasPaypal = Boolean(PAYPAL_CLIENT_ID);
  const canAddStore = productCount > 0;

  const [store, setStore] = useState(initialStore && canAddStore);
  const [method, setMethod] = useState<"stripe" | "paypal">(hasStripe ? "stripe" : "paypal");
  const [status, setStatus] = useState<"idle" | "verifying" | "paid" | "error">("idle");
  const [err, setErr] = useState("");
  const [agreed, setAgreed] = useState(false);
  const sessionId = useRef<string | null>(null);

  const total = sitePrice + (store ? storePrice : 0);

  // Changing the order must rebuild the payment session → collapse the pane.
  const toggleStore = (v: boolean) => {
    setStore(v);
    setAgreed(false);
    setStatus("idle");
    setErr("");
  };

  const fetchClientSecret = useCallback(async () => {
    const r = await fetch(`${FN}/create-stripe-session`, {
      method: "POST",
      body: JSON.stringify({ store }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Could not start Stripe checkout.");
    sessionId.current = d.sessionId;
    return d.clientSecret as string;
  }, [store]);

  const onStripeComplete = useCallback(async () => {
    setStatus("verifying");
    try {
      const r = await fetch(`${FN}/verify-stripe`, {
        method: "POST",
        body: JSON.stringify({ sessionId: sessionId.current }),
      });
      const d = await r.json();
      if (d.paid) {
        setStatus("paid");
        onPaid();
      } else {
        setErr("Payment wasn't completed.");
        setStatus("error");
      }
    } catch {
      setErr("Couldn't confirm the payment.");
      setStatus("error");
    }
  }, [onPaid]);

  return (
    <div className="co-overlay" onClick={onClose}>
      <div className="co-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="co-close" onClick={onClose} aria-label="Close">×</button>

        <div className="co-head">
          <h3 className="co-title">Download your full site</h3>
          <p className="co-sub">One-time payment. Your backup never leaves your browser.</p>
        </div>

        {/* order summary */}
        <div className="co-summary">
          <div className="co-row">
            <span>Full site recovery</span>
            <span>${sitePrice}</span>
          </div>
          {canAddStore && (
            <label className="co-row co-addon">
              <span className="co-addon-l">
                <input type="checkbox" checked={store} onChange={(e) => toggleStore(e.target.checked)} />
                <span>
                  Add store export
                  <small>products · prices · SKUs · variations</small>
                </span>
              </span>
              <span>+${storePrice}</span>
            </label>
          )}
          <div className="co-row co-total">
            <span>Total</span>
            <span>${total}</span>
          </div>
        </div>

        {!hasStripe && !hasPaypal && (
          <div className="co-note">
            Payments aren&apos;t configured on this deployment yet.
          </div>
        )}

        {(hasStripe || hasPaypal) && status !== "paid" && (
          <>
            <div className="co-methods">
              {hasStripe && (
                <button
                  className={`co-method ${method === "stripe" ? "active" : ""}`}
                  onClick={() => setMethod("stripe")}
                >
                  <span aria-hidden="true">💳</span> Card
                </button>
              )}
              {hasPaypal && (
                <button
                  className={`co-method ${method === "paypal" ? "active" : ""}`}
                  onClick={() => setMethod("paypal")}
                >
                  <span aria-hidden="true">🅿️</span> PayPal
                </button>
              )}
            </div>

            <label className="co-agree">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a> — one-time
                digital purchase, <strong>all sales final</strong>.
              </span>
            </label>

            {!agreed ? (
              <p className="co-hint">Accept the terms to continue.</p>
            ) : (
              <>
                {method === "stripe" && hasStripe && stripePromise && (
                  <div className="co-pane">
                    <EmbeddedCheckoutProvider
                      key={store ? "with-store" : "site-only"}
                      stripe={stripePromise}
                      options={{ fetchClientSecret, onComplete: onStripeComplete }}
                    >
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                )}

                {method === "paypal" && hasPaypal && PAYPAL_CLIENT_ID && (
                  <div className="co-pane">
                    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "USD" }}>
                      <PayPalButtons
                        key={store ? "with-store" : "site-only"}
                        style={{ layout: "vertical", color: "blue", shape: "rect" }}
                        createOrder={async () => {
                          const r = await fetch(`${FN}/create-paypal-order`, {
                            method: "POST",
                            body: JSON.stringify({ store }),
                          });
                          const d = await r.json();
                          if (!d.id) throw new Error(d.error || "PayPal error");
                          return d.id;
                        }}
                        onApprove={async (data) => {
                          setStatus("verifying");
                          const r = await fetch(`${FN}/capture-paypal-order`, {
                            method: "POST",
                            body: JSON.stringify({ orderId: data.orderID }),
                          });
                          const d = await r.json();
                          if (d.paid) {
                            setStatus("paid");
                            onPaid();
                          } else {
                            setErr("Payment wasn't completed.");
                            setStatus("error");
                          }
                        }}
                        onError={() => {
                          setErr("Something went wrong with PayPal.");
                          setStatus("error");
                        }}
                      />
                    </PayPalScriptProvider>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {status === "verifying" && <p className="co-status">Confirming payment…</p>}
        {status === "paid" && <p className="co-status ok">✓ Payment confirmed — starting your download.</p>}
        {status === "error" && <p className="co-status err">{err}</p>}

        <p className="co-trust">🔒 Payments handled by Stripe &amp; PayPal — we never see your card details.</p>
      </div>
    </div>
  );
}
