import { NextRequest, NextResponse } from "next/server";

import { createOAuthStateToken, decodeOAuthStateToken, getPaidSessionFromRequest } from "@/lib/auth";
import { upsertStripeConnection } from "@/lib/database";
import {
  buildStripeConnectAuthorizeUrl,
  exchangeStripeOAuthCode,
  retrieveConnectedAccountProfile
} from "@/lib/stripe-client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = getPaidSessionFromRequest(request);
  if (!session) {
    return NextResponse.redirect(new URL("/?paywallError=Unlock%20access%20first", request.url));
  }

  const stripeError = request.nextUrl.searchParams.get("error");
  if (stripeError) {
    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("stripeError", stripeError);
    return NextResponse.redirect(dashboardUrl);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code) {
    try {
      const oauthState = createOAuthStateToken(session.userId);
      const url = buildStripeConnectAuthorizeUrl({
        requestUrl: request.url,
        state: oauthState
      });
      return NextResponse.redirect(url);
    } catch (error) {
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set(
        "stripeError",
        error instanceof Error ? error.message : "Failed to start Stripe OAuth"
      );
      return NextResponse.redirect(dashboardUrl);
    }
  }

  if (!state) {
    return NextResponse.redirect(new URL("/dashboard?stripeError=Missing%20OAuth%20state", request.url));
  }

  const decodedState = decodeOAuthStateToken(state);
  if (!decodedState || decodedState.userId !== session.userId) {
    return NextResponse.redirect(new URL("/dashboard?stripeError=Invalid%20OAuth%20state", request.url));
  }

  try {
    const oauth = await exchangeStripeOAuthCode({
      code
    });

    const profile = await retrieveConnectedAccountProfile(oauth.access_token);

    await upsertStripeConnection({
      userId: session.userId,
      stripeUserId: oauth.stripe_user_id,
      accessToken: oauth.access_token,
      refreshToken: oauth.refresh_token ?? null,
      scope: oauth.scope,
      livemode: oauth.livemode,
      accountDisplayName: profile.displayName,
      accountEmail: profile.email
    });

    return NextResponse.redirect(new URL("/dashboard?stripeConnected=1", request.url));
  } catch (error) {
    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set(
      "stripeError",
      error instanceof Error ? error.message : "Stripe OAuth failed"
    );
    return NextResponse.redirect(dashboardUrl);
  }
}
