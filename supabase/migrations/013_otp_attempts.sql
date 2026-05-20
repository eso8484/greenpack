-- Migration 013: OTP brute-force protection
-- -----------------------------------------------------------------------------
-- Adds a per-code guess counter so verification can lock a code after a small
-- number of wrong attempts. Without this, a 6-digit code (10^6 space) valid for
-- 10 minutes could be brute-forced. See src/lib/otp.ts (verifyOtp).

ALTER TABLE public.verification_otps
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
