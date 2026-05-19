import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Step 1 of OTP-gated email login.
 *
 * Flow:
 *   1. Validate that {email, password} actually authenticates. We do this by
 *      calling signInWithPassword (which transiently sets a session) and then
 *      immediately signing out so the client never receives a live session
 *      from this request — only the OTP completion step is allowed to set
 *      cookies.
 *   2. If credentials are valid, generate a 6-digit OTP, store it in
 *      verification_otps (TTL 10 min), and email it via the configured SMTP.
 *   3. Return success — the client then shows the OTP input.
 *
 * Why validate password first? Two reasons:
 *   - Prevents OTP spam for unknown emails (privacy + anti-abuse).
 *   - Ensures wrong-password attempts fail fast without burning email quota.
 *
 * Google OAuth is unaffected — it skips this endpoint entirely.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ─── Step 1: validate credentials without leaving a live session ────────
    // We deliberately use the server client so any session it sets goes into
    // the response cookies — and we then sign out so those cookies are
    // cleared before returning. This means the client cannot bypass OTP by
    // intercepting cookies on this response.
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      // Don't leak which of "user not found" vs "bad password" — both return
      // the same friendly message.
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Tear down the transient session so the client cannot proceed without OTP.
    await supabase.auth.signOut({ scope: "local" });

    // ─── Step 2: generate + store OTP ──────────────────────────────────────
    const admin = createAdminClient();

    // Rate limit: max 3 OTPs per email in the last 5 minutes.
    const { count } = await admin
      .from("verification_otps")
      .select("*", { count: "exact", head: true })
      .eq("identifier", normalizedEmail)
      .eq("type", "email_login")
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please wait 5 minutes." },
        { status: 429 }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await admin.from("verification_otps").insert({
      identifier: normalizedEmail,
      code,
      type: "email_login",
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    // ─── Step 3: send via SMTP ─────────────────────────────────────────────
    const smtpConfigured =
      !!process.env.SMTP_HOST &&
      !!process.env.SMTP_USER &&
      !!process.env.SMTP_PASS;

    if (!smtpConfigured) {
      // Surface the same error shape as the signup OTP route. In dev/staging
      // without SMTP set, the operator should configure it before enabling
      // OTP login in production.
      return NextResponse.json(
        {
          success: false,
          error:
            "Email delivery is not configured. Ask the operator to set SMTP_HOST/USER/PASS.",
        },
        { status: 503 }
      );
    }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Green Pack Delight" <${process.env.SMTP_FROM || "noreply@greenpackdelight.com"}>`,
      to: normalizedEmail,
      subject: "Your login code - Green Pack Delight",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #22c55e; font-size: 24px; margin: 0;">Green Pack Delight</h1>
          </div>
          <h2 style="color: #111; font-size: 20px; text-align: center;">Your login code</h2>
          <p style="color: #666; text-align: center;">Enter this code to finish signing in:</p>
          <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111;">${code}</span>
          </div>
          <p style="color: #999; font-size: 13px; text-align: center;">This code expires in 10 minutes. If you didn't request it, ignore this email and change your password.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/auth/email-otp/start", err);
    return NextResponse.json(
      { success: false, error: "Failed to start OTP login" },
      { status: 500 }
    );
  }
}
