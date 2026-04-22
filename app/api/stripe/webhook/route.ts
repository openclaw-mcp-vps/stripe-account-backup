import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getPlatformStripeClient } from "@/lib/stripe-client";
import { recordPayment } from "@/lib/database";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook secret or signature missing." }, { status: 400 });
  }

  try {
    const payload = await request.text();
    const stripe = getPlatformStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_details?.email || session.customer_email;

      if (email && session.payment_status === "paid") {
        await recordPayment({
          email,
          source: "stripe",
          status: "paid",
          eventId: event.id,
          amount: session.amount_total,
          currency: session.currency,
          paidAt: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook payload";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
