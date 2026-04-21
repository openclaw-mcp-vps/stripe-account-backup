import Stripe from "stripe";

export type StripeOAuthExchangeResult = Stripe.OAuthToken & {
  access_token: string;
  stripe_user_id: string;
  scope: string;
  livemode: boolean;
};

export function getPlatformStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  return new Stripe(secretKey, {
    appInfo: {
      name: "Stripe Account Backup",
      version: "1.0.0"
    }
  });
}

export function createConnectedStripeClient(accessToken: string) {
  return new Stripe(accessToken, {
    appInfo: {
      name: "Stripe Account Backup",
      version: "1.0.0"
    }
  });
}

export function getAppBaseUrl(requestUrl: string) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }

  try {
    const url = new URL(requestUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "http://localhost:3000";
  }
}

export function buildStripeConnectAuthorizeUrl(params: {
  requestUrl: string;
  state: string;
}) {
  const clientId = process.env.STRIPE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing STRIPE_CLIENT_ID environment variable.");
  }

  const baseUrl = getAppBaseUrl(params.requestUrl);
  const redirectUri = `${baseUrl}/api/stripe/connect`;

  const search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_only",
    state: params.state,
    redirect_uri: redirectUri
  });

  return `https://connect.stripe.com/oauth/authorize?${search.toString()}`;
}

export async function exchangeStripeOAuthCode(params: {
  code: string;
}): Promise<StripeOAuthExchangeResult> {
  const stripe = getPlatformStripeClient();

  const oauth = await stripe.oauth.token({
    grant_type: "authorization_code",
    code: params.code
  });

  if (!oauth.stripe_user_id || !oauth.access_token) {
    throw new Error("Stripe OAuth response did not include required account data.");
  }

  return {
    ...oauth,
    access_token: oauth.access_token,
    stripe_user_id: oauth.stripe_user_id,
    scope: oauth.scope ?? "",
    livemode: oauth.livemode ?? false
  };
}

export async function retrieveConnectedAccountProfile(accessToken: string) {
  const stripe = createConnectedStripeClient(accessToken);
  const account = await stripe.accounts.retrieve();

  const displayName =
    account.business_profile?.name ??
    account.settings?.dashboard?.display_name ??
    account.company?.name ??
    null;

  const email = account.email ?? null;

  return {
    displayName,
    email
  };
}
