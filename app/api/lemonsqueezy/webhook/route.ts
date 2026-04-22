import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { recordPayment } from "@/lib/database";

export const runtime = "nodejs";

function verifyLemonSqueezySignature(payload: string, signature: string, secret: string): boolean {
  const digest = createHmac("sha256", secret).update(payload).digest("hex");

  if (digest.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-signature") || "";
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (secret && !verifyLemonSqueezySignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const body = JSON.parse(payload) as {
      meta?: { event_name?: string };
      data?: {
        id?: string;
        attributes?: {
          user_email?: string;
          total_usd?: number;
        };
      };
    };

    const eventName = body.meta?.event_name;
    const email = body.data?.attributes?.user_email;

    if (eventName === "order_created" && email) {
      await recordPayment({
        email,
        source: "lemonsqueezy",
        status: "active",
        eventId: body.data?.id || `ls-${Date.now()}`,
        amount: body.data?.attributes?.total_usd ?? null,
        currency: "usd",
        paidAt: new Date().toISOString()
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook parse failed";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
