import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { recordStripePayment, removeStripeConnectionByStripeUserId } from "@/lib/database";
import { getPlatformStripeClient } from "@/lib/stripe-client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    return NextResponse.json(
      {
        error: "Missing STRIPE_WEBHOOK_SECRET"
      },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getPlatformStripeClient();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook signature verification failed"
      },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email ?? session.customer_email;

    if (email && session.payment_status === "paid") {
      await recordStripePayment({
        email,
        stripeSessionId: session.id,
        amountTotal: session.amount_total ?? 0,
        currency: session.currency ?? "usd"
      });
    }
  }

  if (event.type === "account.application.deauthorized") {
    if (event.account) {
      await removeStripeConnectionByStripeUserId(event.account);
    }
  }

  return NextResponse.json({ received: true });
}
