import { createHmac, timingSafeEqual } from "node:crypto";

export const PAYWALL_COOKIE_NAME = "sab_access";
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  return process.env.PAYWALL_COOKIE_SECRET || "local-dev-only-secret-change-me";
}

function signTokenPayload(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createAccessToken(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${normalizedEmail}.${issuedAt}`;
  const signature = signTokenPayload(payload);

  return `${payload}.${signature}`;
}

export function verifyAccessToken(token: string): string | null {
  const parts = token.split(".");

  if (parts.length < 3) {
    return null;
  }

  const signature = parts.pop();

  if (!signature) {
    return null;
  }

  const payload = parts.join(".");
  const expectedSignature = signTokenPayload(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  const safe = timingSafeEqual(actualBuffer, expectedBuffer);

  if (!safe) {
    return null;
  }

  const [email, issuedAtRaw] = parts;
  const issuedAt = Number.parseInt(issuedAtRaw, 10);

  if (!email || Number.isNaN(issuedAt)) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  if (now - issuedAt > TOKEN_MAX_AGE_SECONDS) {
    return null;
  }

  return email;
}

export function getAuthenticatedEmailFromCookieStore(
  cookieStore: { get: (name: string) => { value: string } | undefined }
): string | null {
  const token = cookieStore.get(PAYWALL_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyAccessToken(token);
}

export function getAuthenticatedEmailFromRequestCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) {
    return null;
  }

  return verifyAccessToken(cookieValue);
}

export function getAccessCookieMaxAge(): number {
  return TOKEN_MAX_AGE_SECONDS;
}
