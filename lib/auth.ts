import crypto from "node:crypto";

import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE_NAME = "sab_paid_session";
const SESSION_DAYS = 30;

type SignedPayload<T> = {
  payload: T;
  exp: number;
};

export type PaidSession = {
  userId: string;
  email: string;
};

export type OAuthState = {
  userId: string;
  nonce: string;
};

function getAuthSecret() {
  return process.env.APP_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-only-change-me";
}

function encodeBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function decodeBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function createSignedToken<T>(payload: T, ttlSeconds: number) {
  const wrapped: SignedPayload<T> = {
    payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  };
  const encoded = encodeBase64Url(JSON.stringify(wrapped));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

function verifySignedToken<T>(token: string): T | null {
  const [encoded, providedSignature] = token.split(".");
  if (!encoded || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encoded);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const wrapped = JSON.parse(decodeBase64Url(encoded)) as SignedPayload<T>;
    if (!wrapped.exp || wrapped.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return wrapped.payload;
  } catch {
    return null;
  }
}

export function createPaidSessionToken(session: PaidSession) {
  return createSignedToken(session, SESSION_DAYS * 24 * 60 * 60);
}

export function decodePaidSessionToken(token: string) {
  return verifySignedToken<PaidSession>(token);
}

export function applyPaidSessionCookie(response: NextResponse, session: PaidSession) {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: createPaidSessionToken(session),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60
  });
}

export function clearPaidSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0
  });
}

export async function getPaidSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return decodePaidSessionToken(token);
}

export function getPaidSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return decodePaidSessionToken(token);
}

export function createOAuthStateToken(userId: string) {
  return createSignedToken<OAuthState>(
    {
      userId,
      nonce: crypto.randomUUID()
    },
    10 * 60
  );
}

export function decodeOAuthStateToken(token: string) {
  return verifySignedToken<OAuthState>(token);
}
