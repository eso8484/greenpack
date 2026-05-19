-- ============================================================================
-- 010_profile_location.sql
-- Adds customer/vendor address + coordinates to profiles so:
--   1. Customers can capture their delivery address at signup (no need to
--      re-type it at every checkout).
--   2. Vendors who chose "Use My Location" during signup can prefill their
--      shop registration form.
--   3. Courier distance estimates can use the customer's saved coords as a
--      fallback when the order's customer_info.address lacks geocoding.
--
-- All columns are nullable — this migration is additive only.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address    TEXT,
  ADD COLUMN IF NOT EXISTS city       TEXT,
  ADD COLUMN IF NOT EXISTS state      TEXT,
  ADD COLUMN IF NOT EXISTS lat        NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS lng        NUMERIC(10,7);

CREATE INDEX IF NOT EXISTS idx_profiles_coords ON public.profiles (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

COMMENT ON COLUMN public.profiles.address IS 'Free-form delivery/contact address';
COMMENT ON COLUMN public.profiles.lat     IS 'Verified latitude (from geolocation or geocode)';
COMMENT ON COLUMN public.profiles.lng     IS 'Verified longitude (from geolocation or geocode)';
