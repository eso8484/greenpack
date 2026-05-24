import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateNumericOtp } from "@/lib/security";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import {
  sendTransactionalEmail,
  transactionalEmailConfigured,
} from "@/lib/email";
import { EMAIL_LOGO_URL } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    if (!(await rateLimit(`send-email:${clientIp(request)}`, 8, 3600))) {
      return tooManyRequests();
    }
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Rate limit: max 3 OTPs per email in last 5 minutes
    const { count } = await supabase
      .from("verification_otps")
      .select("*", { count: "exact", head: true })
      .eq("identifier", email.toLowerCase())
      .eq("type", "email")
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please wait 5 minutes." },
        { status: 429 }
      );
    }

    // Fail loudly when email transport is not configured.
    if (!transactionalEmailConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Email delivery is not configured. Set RESEND_API_KEY (preferred) or SMTP_HOST/USER/PASS in .env.local.",
        },
        { status: 503 }
      );
    }

    // Generate 6-digit OTP (cryptographically secure)
    const code = generateNumericOtp(6);

    // Store OTP (expires in 10 minutes)
    await supabase.from("verification_otps").insert({
      identifier: email.toLowerCase(),
      code,
      type: "email",
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    const ok = await sendTransactionalEmail({
      to: email,
      subject: "Verify your email - Green Pack Delight",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${EMAIL_LOGO_URL}" alt="Green Pack Delight" width="64" height="64" style="width: 64px; height: 64px; border-radius: 12px; display: inline-block;" />
            <h1 style="color: #22c55e; font-size: 22px; margin: 12px 0 0;">Green Pack Delight</h1>
          </div>
          <h2 style="color: #111; font-size: 20px; text-align: center;">Verify your email</h2>
          <p style="color: #666; text-align: center;">Enter this code to complete your signup:</p>
          <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111;">${code}</span>
          </div>
          <p style="color: #999; font-size: 13px; text-align: center;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
      `,
      text: `Your Green Pack Delight verification code: ${code}\n\nThis code expires in 10 minutes.`,
    });

    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Could not deliver the verification email." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/verify/send-email", err);
    return NextResponse.json(
      { success: false, error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
