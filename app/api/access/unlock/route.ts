import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccessToken, getAccessCookieMaxAge, PAYWALL_COOKIE_NAME } from "@/lib/access-control";
import { hasPaidAccess } from "@/lib/database";

const unlockSchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  try {
    const payload = unlockSchema.parse(await request.json());
    const email = payload.email.toLowerCase();

    const paid = await hasPaidAccess(email);

    if (!paid) {
      return NextResponse.json(
        {
          success: false,
          error: "No completed Stripe checkout found for this email yet."
        },
        { status: 403 }
      );
    }

    const token = createAccessToken(email);
    const response = NextResponse.json({ success: true });

    response.cookies.set(PAYWALL_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: getAccessCookieMaxAge(),
      path: "/"
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";

    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: 400 }
    );
  }
}
