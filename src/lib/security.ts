/**
 * Server-only security primitives.
 *
 * These rely on Node's `crypto` module and must never be imported into a
 * client component.
 */

import { randomInt, timingSafeEqual } from "crypto";

/**
 * Generate a cryptographically secure numeric one-time code.
 *
 * `Math.random()` is a non-cryptographic PRNG — its output is predictable and
 * must never be used for OTPs, tokens, or anything an attacker could try to
 * guess. `crypto.randomInt` draws from the OS CSPRNG.
 *
 * @param digits length of the code (default 6)
 * @returns a zero-padded string of the requested length, e.g. "048213"
 */
export function generateNumericOtp(digits = 6): string {
  const max = 10 ** digits; // exclusive upper bound
  return randomInt(0, max).toString().padStart(digits, "0");
}

/**
 * Constant-time string comparison.
 *
 * A plain `a === b` short-circuits on the first differing byte, leaking how
 * many leading characters matched via response timing — enough, over many
 * requests, to recover a secret (HMAC signature, shared API key) byte by byte.
 * `timingSafeEqual` always compares the full buffer.
 *
 * Returns false (without throwing) when either input is missing or the lengths
 * differ. Length is not itself secret here, and bailing early on a length
 * mismatch avoids leaking the expected length through an exception.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
