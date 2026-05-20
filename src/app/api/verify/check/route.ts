import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

/**
 * Pre-validate an OTP WITHOUT consuming it.
 *
 * This is a UX nicety so the client can show "invalid code" before submitting
 * the real action. The code is intentionally not marked used here — the
 * downstream action (e.g. /api/verify/signup) re-verifies and consumes it, so
 * it remains the single source of truth. Brute-force is capped inside
 * verifyOtp regardless of which path is hit.
 */
export async function POST(request: Request) {
  try {
    if (!(await rateLimit(`verify-check:${clientIp(request)}`, 30, 300))) {
      return tooManyRequests();
    }
    const { identifier, code, type } = await request.json();

    if (!identifier || !code || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["email", "phone"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid type" },
        { status: 400 }
      );
    }

    // Normalize identifier to match how it was stored at send time.
    let normalizedId = String(identifier);
    if (type === "email") {
      normalizedId = normalizedId.toLowerCase();
    } else {
      const cleaned = normalizedId.replace(/\D/g, "");
      if (cleaned.startsWith("0") && cleaned.length === 11) {
        normalizedId = "234" + cleaned.slice(1);
      } else {
        normalizedId = cleaned;
      }
    }

    const result = await verifyOtp({
      identifier: normalizedId,
      type,
      code: String(code),
      consume: false,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.reason === "locked"
              ? "Too many incorrect attempts. Please request a new code."
              : "Invalid or expired code. Please try again.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, verified: true });
  } catch (err) {
    console.error("POST /api/verify/check", err);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
