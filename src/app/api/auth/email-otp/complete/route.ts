import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Step 2 of OTP-gated email login.
 *
 * Flow:
 *   1. Verify the OTP for this email is valid and unused. The OTP was issued
 *      in /api/auth/email-otp/start *after* the password was already
 *      validated, so reaching this endpoint means both factors are in play.
 *   2. Sign in with the password to create the session and write session
 *      cookies — these go on the response so the client is now authenticated.
 *   3. Mark the OTP as used so it can't be replayed.
 */
export async function POST(request: Request) {
  try {
    const { email, password, code } = (await request.json()) as {
      email?: string;
      password?: string;
      code?: string;
    };

    if (!email || !password || !code) {
      return NextResponse.json(
        { success: false, error: "Email, password, and code are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = String(code).trim();

    const admin = createAdminClient();

    // ─── Validate OTP ───────────────────────────────────────────────────────
    const { data: otp } = await admin
      .from("verification_otps")
      .select("*")
      .eq("identifier", normalizedEmail)
      .eq("type", "email_login")
      .eq("code", normalizedCode)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otp) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired code. Please try again." },
        { status: 400 }
      );
    }

    // ─── Complete sign-in (now writes session cookies) ─────────────────────
    const supabase = await createClient();
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

    if (signInError || !signInData.user) {
      // Should not happen because /start already validated, but cover the
      // edge case where the password was changed between start and complete.
      return NextResponse.json(
        { success: false, error: "Could not sign in. Please try again." },
        { status: 401 }
      );
    }

    // Mark OTP used (best-effort; even if this fails, the session is set and
    // the OTP expires in 10 minutes anyway).
    await admin
      .from("verification_otps")
      .update({ used: true })
      .eq("id", otp.id);

    // Look up the role so the client can pick the right post-login destination
    // without a follow-up profile fetch.
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", signInData.user.id)
      .single();

    return NextResponse.json({
      success: true,
      role: profile?.role ?? "customer",
    });
  } catch (err) {
    console.error("POST /api/auth/email-otp/complete", err);
    return NextResponse.json(
      { success: false, error: "Failed to complete OTP login" },
      { status: 500 }
    );
  }
}
