import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { applyPaidSessionCookie } from "@/lib/auth";
import { findPaidUserByEmail, recordStripePayment } from "@/lib/database";
import { getPlatformStripeClient } from "@/lib/stripe-client";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().email()
});

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("paywallError", message);
  return NextResponse.redirect(url);
}

async function findPaidStripeSessionByEmail(email: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  const stripe = getPlatformStripeClient();
  let startingAfter: string | undefined;

  for (let page = 0; page < 5; page += 1) {
    const result = await stripe.checkout.sessions.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {})
    });

    const match = result.data.find((session) => {
      const sessionEmail = session.customer_details?.email ?? session.customer_email;
      return (
        sessionEmail?.toLowerCase() === email.toLowerCase() &&
        session.payment_status === "paid"
      );
    });

    if (match) {
      return match;
    }

    if (!result.has_more) {
      return null;
    }

    startingAfter = result.data[result.data.length - 1]?.id;
    if (!startingAfter) {
      return null;
    }
  }

  return null;
}

async function resolvePaidUser(email: string) {
  const existing = await findPaidUserByEmail(email);
  if (existing) {
    return existing;
  }

  const paidSession = await findPaidStripeSessionByEmail(email);
  if (!paidSession) {
    return null;
  }

  return recordStripePayment({
    email,
    stripeSessionId: paidSession.id,
    amountTotal: paidSession.amount_total ?? 0,
    currency: paidSession.currency ?? "usd"
  });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  let emailInput: unknown;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    emailInput = body.email;
  } else {
    const formData = await request.formData();
    emailInput = formData.get("email");
  }

  const parsed = schema.safeParse({
    email: emailInput
  });

  if (!parsed.success) {
    if (contentType.includes("application/json")) {
      return NextResponse.json(
        {
          error: "Enter the purchase email address from your Stripe receipt."
        },
        { status: 400 }
      );
    }

    return redirectWithError(request, "Enter a valid purchase email address.");
  }

  const user = await resolvePaidUser(parsed.data.email);

  if (!user) {
    if (contentType.includes("application/json")) {
      return NextResponse.json(
        {
          error:
            "No completed Stripe payment was found for this email. Complete checkout first, then verify again."
        },
        { status: 402 }
      );
    }

    return redirectWithError(
      request,
      "No paid checkout found for that email yet. Complete checkout first, then try again."
    );
  }

  if (contentType.includes("application/json")) {
    const response = NextResponse.json({ ok: true });
    applyPaidSessionCookie(response, {
      userId: user.id,
      email: user.email
    });
    return response;
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  applyPaidSessionCookie(response, {
    userId: user.id,
    email: user.email
  });
  return response;
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return redirectWithError(request, "Provide your purchase email to unlock dashboard access.");
  }

  const parsed = schema.safeParse({ email });
  if (!parsed.success) {
    return redirectWithError(request, "Provide a valid purchase email address.");
  }

  const user = await resolvePaidUser(parsed.data.email);

  if (!user) {
    return redirectWithError(request, "No paid checkout found for that email yet.");
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  applyPaidSessionCookie(response, {
    userId: user.id,
    email: user.email
  });
  return response;
}
