import { NextRequest, NextResponse } from "next/server";

import { clearPaidSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  clearPaidSessionCookie(response);
  return response;
}
