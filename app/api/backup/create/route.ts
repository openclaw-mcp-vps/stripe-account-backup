import { NextResponse } from "next/server";
import { z } from "zod";
import { createBackupForEmail, initBackupScheduler } from "@/lib/backup-generator";
import { getAuthenticatedEmailFromRequestCookie, PAYWALL_COOKIE_NAME } from "@/lib/access-control";
import { getUserByEmail, hasPaidAccess } from "@/lib/database";

export const runtime = "nodejs";

const createSchema = z.object({
  kind: z.enum(["full", "incremental"]).default("full")
});

function readCookieValue(cookieHeader: string | null, cookieName: string): string | undefined {
  return cookieHeader
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${cookieName}=`))
    ?.split("=")[1];
}

export async function POST(request: Request) {
  try {
    const cookieValue = readCookieValue(request.headers.get("cookie"), PAYWALL_COOKIE_NAME);
    const email = getAuthenticatedEmailFromRequestCookie(cookieValue);

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paid = await hasPaidAccess(email);

    if (!paid) {
      return NextResponse.json({ error: "Payment required" }, { status: 403 });
    }

    const user = await getUserByEmail(email);

    if (!user?.stripeAccessToken) {
      return NextResponse.json({ error: "Connect Stripe before creating backups." }, { status: 400 });
    }

    const body = createSchema.parse(await request.json());
    initBackupScheduler();

    const backup = await createBackupForEmail(email, body.kind);

    return NextResponse.json({
      backup: {
        id: backup.id,
        kind: backup.kind,
        status: backup.status,
        createdAt: backup.createdAt,
        updatedAt: backup.updatedAt,
        fileName: backup.fileName,
        sizeBytes: backup.sizeBytes,
        error: backup.error
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create backup";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
