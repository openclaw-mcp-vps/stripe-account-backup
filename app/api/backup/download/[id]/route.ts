import { NextRequest, NextResponse } from "next/server";

import { getPaidSessionFromRequest } from "@/lib/auth";
import { getBackupByIdForUser } from "@/lib/database";
import { loadBackupArchive } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const session = getPaidSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const backup = await getBackupByIdForUser(id, session.userId);

  if (!backup || backup.status !== "complete" || !backup.storageKey) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  const archive = await loadBackupArchive(backup.storageKey);

  if (archive.kind === "redirect") {
    return NextResponse.redirect(archive.url);
  }

  const body = new Uint8Array(archive.buffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=\"${backup.fileName || "stripe-backup.zip"}\"`,
      "Cache-Control": "private, no-store"
    }
  });
}
