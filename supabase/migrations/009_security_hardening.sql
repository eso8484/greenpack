-- ============================================================================
-- 009_security_hardening.sql
-- Closes three vulnerabilities discovered in the May 2026 codebase audit:
--   1. Privilege escalation: any signed-in user could promote themselves to
--      admin via `update profiles set role='admin' where id=auth.uid()` because
--      `profiles_update_own` had no column-level restriction.
--   2. Review forgery: `reviews_insert_auth` only required a session, so users
--      could insert reviews under another user's customer_id by calling the
--      Supabase JS client directly.
--   3. Paystack settlement fields on shops were writable by the owner via the
--      same RLS path used for shop edits; we lock them to admin/service-role.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES: prevent self-promotion to admin/vendor/courier
-- ---------------------------------------------------------------------------
-- Allow users to update their own profile, but ONLY non-sensitive columns.
-- A BEFORE UPDATE trigger rejects any change to `role` that isn't performed
-- by an existing admin (or service_role, which bypasses RLS+triggers).

CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Allow updates that don't touch the role column.
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- Service-role / superuser callers (no JWT, no auth.uid()) bypass this guard.
  -- This is the trusted path used by the admin client in our server routes.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Otherwise only an existing admin can change role.
  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only admins can change profile role'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

REVOKE EXECUTE ON FUNCTION public.guard_profile_role_change() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_profile_role ON public.profiles;
CREATE TRIGGER trg_guard_profile_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.guard_profile_role_change();

-- Note: the seller/shop POST flow flips role customer→vendor server-side using
-- a Supabase server client which is authenticated as the user, NOT service-role.
-- That flip currently relies on the user being non-admin and would now be
-- blocked by this trigger. The fixed POST /api/seller/shop route is updated to
-- use the admin client for the role flip (legitimate first-time vendor signup).

-- ---------------------------------------------------------------------------
-- 2. REVIEWS: require customer_id = auth.uid() on insert
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "reviews_insert_auth" ON public.reviews;
CREATE POLICY "reviews_insert_self" ON public.reviews FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND customer_id = auth.uid()
);

-- ---------------------------------------------------------------------------
-- 3. SHOPS: lock Paystack settlement fields to admin/service-role
-- ---------------------------------------------------------------------------
-- The /api/seller/payout route uses the user-scoped supabase client and updates
-- these fields after talking to Paystack. We need either:
--   (a) move that update to admin client, OR
--   (b) keep RLS open for owners but make it explicit.
-- We pick (a) in code; this trigger is a belt+suspenders defense: any direct
-- write from the browser to these columns is rejected unless the caller is admin.

CREATE OR REPLACE FUNCTION public.guard_shop_settlement_change()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  IF
    NEW.paystack_subaccount_code IS NOT DISTINCT FROM OLD.paystack_subaccount_code
    AND NEW.settlement_bank_code IS NOT DISTINCT FROM OLD.settlement_bank_code
    AND NEW.settlement_account_number IS NOT DISTINCT FROM OLD.settlement_account_number
    AND NEW.settlement_account_name IS NOT DISTINCT FROM OLD.settlement_account_name
  THEN
    RETURN NEW;
  END IF;

  -- Service-role bypass (the trusted path used by /api/seller/payout).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Settlement fields can only be set via /api/seller/payout'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

REVOKE EXECUTE ON FUNCTION public.guard_shop_settlement_change() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_shop_settlement ON public.shops;
CREATE TRIGGER trg_guard_shop_settlement
  BEFORE UPDATE OF
    paystack_subaccount_code,
    settlement_bank_code,
    settlement_account_number,
    settlement_account_name
  ON public.shops
  FOR EACH ROW EXECUTE PROCEDURE public.guard_shop_settlement_change();
