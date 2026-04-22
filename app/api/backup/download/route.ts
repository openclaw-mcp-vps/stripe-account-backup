import { readFile } from "node:fs/promises";
import path from "node:path";
import AWS from "aws-sdk";
import { NextResponse } from "next/server";
import { getAuthenticatedEmailFromRequestCookie, PAYWALL_COOKIE_NAME } from "@/lib/access-control";
import { getBackupById, hasPaidAccess } from "@/lib/database";

export const runtime = "nodejs";

function readCookieValue(cookieHeader: string | null, cookieName: string): string | undefined {
  return cookieHeader
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${cookieName}=`))
    ?.split("=")[1];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const backupId = url.searchParams.get("id");

  if (!backupId) {
    return NextResponse.json({ error: "Missing backup id" }, { status: 400 });
  }

  const cookieValue = readCookieValue(request.headers.get("cookie"), PAYWALL_COOKIE_NAME);
  const email = getAuthenticatedEmailFromRequestCookie(cookieValue);

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paid = await hasPaidAccess(email);

  if (!paid) {
    return NextResponse.json({ error: "Payment required" }, { status: 403 });
  }

  const backup = await getBackupById(email, backupId);

  if (!backup || backup.status !== "completed") {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  if (backup.storageProvider === "s3") {
    const bucket = process.env.AWS_S3_BUCKET;

    if (!bucket) {
      return NextResponse.json({ error: "S3 bucket is not configured" }, { status: 500 });
    }

    const s3 = new AWS.S3({ region: process.env.AWS_REGION || "us-east-1" });
    const signedUrl = await s3.getSignedUrlPromise("getObject", {
      Bucket: bucket,
      Key: backup.storagePath,
      Expires: 120
    });

    return NextResponse.redirect(signedUrl);
  }

  const filePath = path.resolve(backup.storagePath);
  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${backup.fileName}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
