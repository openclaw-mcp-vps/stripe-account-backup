import Stripe from "stripe";
import { getUserByEmail } from "@/lib/database";

const STRIPE_API_VERSION = "2024-06-20" as Stripe.LatestApiVersion;

function createClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION
  });
}

export function getPlatformStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  return createClient(secretKey);
}

export async function exchangeStripeOAuthCode(code: string): Promise<{
  stripeUserId: string;
  accessToken: string;
  refreshToken: string;
  scope: string;
  livemode: boolean;
}> {
  const stripe = getPlatformStripeClient();
  const response = await stripe.oauth.token({
    grant_type: "authorization_code",
    code
  });

  if (!response.stripe_user_id || !response.access_token || !response.refresh_token) {
    throw new Error("Stripe OAuth token response did not contain expected account credentials.");
  }

  return {
    stripeUserId: response.stripe_user_id,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    scope: response.scope ?? "read_only",
    livemode: Boolean(response.livemode)
  };
}

export async function getUserStripeClient(email: string): Promise<Stripe> {
  const user = await getUserByEmail(email);

  if (!user?.stripeAccessToken) {
    throw new Error("Stripe account is not connected yet.");
  }

  return createClient(user.stripeAccessToken);
}

export function buildStripeConnectAuthorizeUrl(baseUrl: string, state: string): string {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;

  if (!clientId) {
    throw new Error("Missing STRIPE_CONNECT_CLIENT_ID environment variable.");
  }

  const callbackUrl = `${baseUrl}/api/stripe/connect`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_only",
    state,
    redirect_uri: callbackUrl
  });

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}
