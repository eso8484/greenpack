-- Migration 015: Remove dangerously-permissive verification_otps RLS policy.
-- -----------------------------------------------------------------------------
-- The policy was named "Service role full access" but was scoped TO public with
-- USING(true)/WITH CHECK(true) — letting ANYONE holding the public anon key
-- (which ships in the browser bundle) read or modify every OTP code. That voids
-- OTP confidentiality entirely.
--
-- Every server access to this table uses the service-role admin client, which
-- bypasses RLS, so dropping the policy leaves the table deny-all to
-- anon/authenticated while the legitimate server paths keep working.

DROP POLICY IF EXISTS "Service role full access on verification_otps" ON public.verification_otps;
