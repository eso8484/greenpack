-- ============================================================
-- Migration 002: Add verification OTPs table + profile fields
-- ============================================================

-- Add new columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- OTP verification codes table
CREATE TABLE IF NOT EXISTS verification_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,            -- email or phone number
  code TEXT NOT NULL,                   -- 6-digit OTP
  type TEXT NOT NULL CHECK (type IN ('email', 'phone')),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast OTP lookups
CREATE INDEX IF NOT EXISTS idx_verification_otps_lookup
ON verification_otps (identifier, type, used, expires_at);

-- Auto-cleanup expired OTPs (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM verification_otps WHERE expires_at < NOW() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_otps ON verification_otps;
CREATE TRIGGER trg_cleanup_otps
AFTER INSERT ON verification_otps
EXECUTE FUNCTION cleanup_expired_otps();

-- RLS for verification_otps (only server/admin can manage)
ALTER TABLE verification_otps ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API routes use admin client)
CREATE POLICY "Service role full access on verification_otps"
ON verification_otps FOR ALL
USING (TRUE)
WITH CHECK (TRUE);
