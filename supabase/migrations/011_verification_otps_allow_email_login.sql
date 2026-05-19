-- ============================================================================
-- 011_verification_otps_allow_email_login.sql
-- The verification_otps.type CHECK constraint originally allowed only
-- ('email', 'phone'). The new OTP-gated email login flow inserts rows with
-- type = 'email_login' to keep them distinct from signup verification OTPs
-- (so login codes can't be reused during signup and vice versa).
--
-- This migration relaxes the constraint to permit the new value.
-- ============================================================================

ALTER TABLE public.verification_otps
  DROP CONSTRAINT IF EXISTS verification_otps_type_check;

ALTER TABLE public.verification_otps
  ADD CONSTRAINT verification_otps_type_check
    CHECK (type = ANY (ARRAY['email'::text, 'phone'::text, 'email_login'::text]));
