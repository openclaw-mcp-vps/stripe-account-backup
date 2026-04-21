import { NextRequest, NextResponse } from "next/server";

import {
  createStripeBackup,
  ensureBackupSchedulerRunning,
  runScheduledBackupsNow
} from "@/lib/backup-generator";
import { getPaidSessionFromRequest } from "@/lib/auth";
import { getStripeConnectionByUserId } from "@/lib/database";

export const runtime = "nodejs";

ensureBackupSchedulerRunning();

export async function POST(request: NextRequest) {
  const session = getPaidSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Access denied. Complete payment first." }, { status: 401 });
  }

  const connection = await getStripeConnectionByUserId(session.userId);

  if (!connection) {
    return NextResponse.json(
      {
        error: "No Stripe account connected yet. Connect Stripe before creating a backup."
      },
      { status: 400 }
    );
  }

  try {
    const backup = await createStripeBackup({
      userId: session.userId,
      stripeConnection: connection
    });

    return NextResponse.json({
      ok: true,
      backup
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Backup failed"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const received =
    request.headers.get("x-cron-secret") ?? request.nextUrl.searchParams.get("secret");

  if (received !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await runScheduledBackupsNow();
  return NextResponse.json({ ok: true, processed });
}
