/**
 * Server-side rate limiting backed by Postgres (serverless-safe — survives
 * across stateless function invocations, unlike an in-memory counter).
 *
 * Server-only: uses the service-role admin client to call check_rate_limit().
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * @returns true if the request is allowed, false if the limit is exceeded.
 *
 * Fails OPEN: if the limiter itself errors we allow the request rather than
 * take the site down. Sensitive endpoints keep their own per-identifier checks
 * (e.g. per-email OTP caps, per-code attempt caps) as a second layer.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("rateLimit rpc error (failing open):", error);
      return true;
    }
    return data === true;
  } catch (err) {
    console.error("rateLimit exception (failing open):", err);
    return true;
  }
}

/**
 * Best-effort client IP from proxy headers. Vercel/most proxies set
 * `x-forwarded-for`; the left-most entry is the original client.
 */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/** Standard 429 response. */
export function tooManyRequests(
  message = "Too many requests. Please slow down and try again shortly."
) {
  return NextResponse.json({ success: false, error: message }, { status: 429 });
}
