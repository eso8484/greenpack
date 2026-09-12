-- ============================================================================
-- 017_vendor_accounts.sql
--
-- Gives the vendor account its own identity.
--
-- Until now a vendor was just `profiles.role = 'vendor'` on the same
-- auth.users row as the customer account. Because auth.users.email is unique,
-- one email meant one row, one role and one password — so a person who was both
-- a customer and a vendor shared a single credential, and "Continue with
-- Google" on the vendor page could only ever resolve to the customer row.
--
-- The fix is to give the vendor account its OWN auth.users row, keyed on an
-- internal address (v.<uuid>@vendors.greenpackdelight.com — a subdomain with no
-- MX, never mailed, never shown), while the address the person actually types
-- lives here in profiles.email. Two rows, two passwords, one visible email.
--
-- profiles.email is deliberately NOT unique — that duplication is the whole
-- point. Uniqueness is enforced only among vendors, below.
--
-- Additive and idempotent. The backfill only fills rows that are still NULL, so
-- re-running is safe.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.profiles.email IS
  'The address the user actually types. Not unique: a customer account and a vendor account may share one email. For a vendor account this differs from auth.users.email, which holds an internal, non-routable address.';

-- One vendor account per email. The customer side is deliberately unconstrained.
-- This index also serves resolveVendorAuthEmail()'s lookup — a query matching on
-- lower(email) implies email IS NOT NULL, so the partial predicate doesn't block
-- its use.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_vendor_email
  ON public.profiles (lower(email))
  WHERE role = 'vendor' AND email IS NOT NULL;

-- Backfill the visible address for every existing profile from its auth row.
-- Today the two are the same value, so this seeds profiles.email with what the
-- user already knows. Existing vendors keep signing in on their real-email auth
-- row via the resolver's legacy branch — this migration does not split them.
UPDATE public.profiles p
   SET email = lower(u.email)
  FROM auth.users u
 WHERE u.id = p.id
   AND p.email IS NULL
   AND u.email IS NOT NULL;

-- Keep profiles.email populated for accounts created from here on. The backfill
-- above is one-time; without this, every new signup would land with a NULL
-- email and the vendor-facing pages that display it would fall back to the
-- session's auth address — which for a vendor is the internal one.
--
-- contact_email wins over new.email because a split vendor row is created with
-- an internal address and the real one passed alongside it in user_metadata.
-- CREATE OR REPLACE keeps the existing on_auth_user_created trigger attached.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    lower(coalesce(new.raw_user_meta_data->>'contact_email', new.email))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path='public';
