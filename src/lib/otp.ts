/**
 * Centralized one-time-code verification.
 *
 * Every OTP-consuming route should go through `verifyOtp` so brute-force
 * protection, single-use enforcement, and constant-time comparison are applied
 * consistently. Rolling these checks by hand in each route is how gaps creep in
 * (e.g. an endpoint that never caps guess attempts).
 *
 * Server-only — uses the service-role admin client.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/security";

export type OtpType = "email" | "phone" | "email_login";

/** Max wrong guesses against a single live code before it is burned. */
export const MAX_OTP_ATTEMPTS = 5;

export type OtpFailureReason = "not_found" | "locked" | "mismatch";

export interface VerifyOtpArgs {
  /** Stored identifier — caller must normalize (email lowercased, phone digits). */
  identifier: string;
  type: OtpType;
  code: string;
  /** Mark the code used on success so it cannot be replayed. Default true. */
  consume?: boolean;
}

export interface VerifyOtpResult {
  ok: boolean;
  reason?: OtpFailureReason;
}

/**
 * Validate a code against the most-recent live (unused, unexpired) OTP for the
 * identifier+type. Only the latest code is accepted — issuing a new code (e.g.
 * a resend) invalidates older ones.
 *
 * - Caps wrong guesses at {@link MAX_OTP_ATTEMPTS}; the code is burned once the
 *   cap is hit, so an attacker cannot keep guessing a 6-digit space.
 * - Compares in constant time.
 * - On success, optionally marks the code used (single-use).
 */
export async function verifyOtp({
  identifier,
  type,
  code,
  consume = true,
}: VerifyOtpArgs): Promise<VerifyOtpResult> {
  const admin = createAdminClient();

  const { data: otp } = await admin
    .from("verification_otps")
    .select("id, code, attempts")
    .eq("identifier", identifier)
    .eq("type", type)
    .eq("used", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return { ok: false, reason: "not_found" };

  const attempts = (otp.attempts as number | null) ?? 0;
  if (attempts >= MAX_OTP_ATTEMPTS) {
    // Burn it: further guesses against this code are pointless.
    await admin.from("verification_otps").update({ used: true }).eq("id", otp.id);
    return { ok: false, reason: "locked" };
  }

  if (!safeEqual(String(otp.code), String(code))) {
    await admin
      .from("verification_otps")
      .update({ attempts: attempts + 1 })
      .eq("id", otp.id);
    return { ok: false, reason: "mismatch" };
  }

  if (consume) {
    await admin.from("verification_otps").update({ used: true }).eq("id", otp.id);
  }

  return { ok: true };
}
