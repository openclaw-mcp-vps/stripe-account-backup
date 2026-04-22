import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { buildStripeConnectAuthorizeUrl, exchangeStripeOAuthCode } from "@/lib/stripe-client";
import { getAuthenticatedEmailFromRequestCookie, PAYWALL_COOKIE_NAME } from "@/lib/access-control";
import { upsertStripeConnection } from "@/lib/database";

const STRIPE_OAUTH_STATE_COOKIE = "sab_stripe_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    const rawCookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${PAYWALL_COOKIE_NAME}=`))
      ?.split("=")[1];

    const email = getAuthenticatedEmailFromRequestCookie(rawCookie);

    if (!email) {
      return NextResponse.redirect(new URL("/?unlock=required", url.origin));
    }

    const oauthState = randomUUID();
    const redirectUrl = buildStripeConnectAuthorizeUrl(url.origin, oauthState);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set(STRIPE_OAUTH_STATE_COOKIE, `${oauthState}:${email}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60
    });

    return response;
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const stateCookie = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${STRIPE_OAUTH_STATE_COOKIE}=`))
    ?.split("=")[1];

  if (!state || !stateCookie) {
    return NextResponse.redirect(new URL("/dashboard?error=oauth_state_missing", url.origin));
  }

  const decodedStateCookie = decodeURIComponent(stateCookie);
  const [expectedState, email] = decodedStateCookie.split(":");

  if (!expectedState || !email || expectedState !== state) {
    return NextResponse.redirect(new URL("/dashboard?error=oauth_state_invalid", url.origin));
  }

  try {
    const token = await exchangeStripeOAuthCode(code);

    await upsertStripeConnection({
      email,
      stripeAccountId: token.stripeUserId,
      stripeAccessToken: token.accessToken,
      stripeRefreshToken: token.refreshToken,
      stripeScope: token.scope,
      stripeLivemode: token.livemode
    });

    const response = NextResponse.redirect(new URL("/dashboard?connected=1", url.origin));
    response.cookies.delete(STRIPE_OAUTH_STATE_COOKIE);

    return response;
  } catch {
    return NextResponse.redirect(new URL("/dashboard?error=oauth_exchange_failed", url.origin));
  }
}
