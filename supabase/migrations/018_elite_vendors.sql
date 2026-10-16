-- ============================================================================
-- 018_elite_vendors.sql
-- The elite tier: a shop flag the vendor cannot set, and the application that
-- asks a human to set it.
--
-- What "elite" means here is placement, not quality judgement: an elite shop
-- leads the homepage's promoted list and wears a pill on its card. It is not
-- purchasable, not self-serve, and not a different kind of account — the shop
-- keeps every route, section, and search result it had the day before. The
-- bar is published on the application page, a rejection carries its reason,
-- and re-applying after fixing the gap is allowed by construction.
--
-- Why this migration is mostly a security migration: adding `is_elite` to
-- `shops` with nothing else in place would make it **self-grantable by any
-- vendor from the browser**, because three separate layers all permit it —
--
--   1. `shops_update_owner` is an UPDATE policy with `qual = (auth.uid() =
--      owner_id)` and `with_check = NULL`. Postgres defaults a missing
--      WITH CHECK to the USING expression, so an owner may write *any* column
--      of their own row.
--   2. `PUT /api/shops/[shopId]` spreads the raw client body straight into the
--      update (`.update({ ...body, updated_at })`) with no field allow-list.
--   3. `POST /api/seller/shop` is guarded only by a zod schema — a layer that
--      changes whenever someone adds a field.
--
-- Point 1 alone is sufficient to lose the flag. A BEFORE UPDATE trigger at the
-- database closes all three at once, and keeps closing them no matter what the
-- routes above it do later. That is what `guard_shop_elite_change()` is.
--
-- The second layer is `elite_applications` having **no UPDATE policy at all**:
-- a vendor cannot approve themselves even with a forged request, and cannot
-- rewrite their own pitch after review. Every review write goes through
-- `createAdminClient()` (service role), which bypasses RLS — the same shape as
-- `/api/admin/couriers/[courierId]`. An admin UPDATE policy was considered and
-- rejected: it would need a `profiles.role` subquery inside a shops-adjacent
-- policy, which is the recursion `012_fix_orders_rls_recursion.sql` exists to
-- clean up.
--
-- Additive and idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The flag
-- ---------------------------------------------------------------------------
-- NOT NULL DEFAULT false so every existing row reads `false` without a
-- backfill, and so the column can never be NULL-means-unknown. No mock shop and
-- no seed row is elite: the homepage renders exactly as it does today until a
-- real application is approved, which is the whole point of not seeding this.

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS is_elite boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.shops.is_elite IS
  'Leads the homepage promoted list and wears the Elite Partner pill. Set only by admin approval of an elite_applications row — guarded by trg_guard_shop_elite. Never purchasable, never self-serve.';

-- ---------------------------------------------------------------------------
-- The application
-- ---------------------------------------------------------------------------
-- `owner_id` is denormalised from the shop on purpose. It is the column the RLS
-- policies below match on, and reading it from here keeps those policies a
-- plain `auth.uid() = owner_id` comparison with no subquery into `shops` — the
-- shape that stays indexable and cannot recurse.

CREATE TABLE IF NOT EXISTS public.elite_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  pitch text NOT NULL,
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.elite_applications IS
  'A vendor''s request to be reviewed for the elite tier. Vendors may insert and read their own rows only; there is deliberately no UPDATE policy, so all review writes go through the service role.';
COMMENT ON COLUMN public.elite_applications.pitch IS
  'The vendor''s own case for the shop, in their words. Shown to the reviewer; never shown publicly.';
COMMENT ON COLUMN public.elite_applications.review_note IS
  'The reviewer''s reason. On a rejection it is surfaced back to the vendor, which is what makes the decision legible rather than arbitrary.';

-- One open application per shop. Partial on `status = 'pending'`, so a decided
-- application does not block the next one: a rejected vendor can fix the gap
-- and re-apply, and an approved shop can re-apply if it ever loses the flag.
-- This is also what turns a double-submit into a clean 409 at the API layer
-- rather than a pair of rows a reviewer has to reconcile.

CREATE UNIQUE INDEX IF NOT EXISTS idx_elite_applications_one_open
  ON public.elite_applications (shop_id)
  WHERE status = 'pending';

-- The reviewer queue reads pending-first, newest-last.
CREATE INDEX IF NOT EXISTS idx_elite_applications_status_created
  ON public.elite_applications (status, created_at);

-- ---------------------------------------------------------------------------
-- RLS — owner SELECT and INSERT only
-- ---------------------------------------------------------------------------
-- Read and apply, nothing else. No UPDATE (a vendor cannot approve themselves,
-- nor edit a pitch already under review — and after a rejection, the way back
-- is a *new* row, which the partial index above permits). No DELETE (a
-- withdrawn application is noise a reviewer should still be able to see).
--
-- The service role bypasses RLS entirely, so the admin review route needs no
-- policy here.

ALTER TABLE public.elite_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS elite_applications_select_own ON public.elite_applications;
CREATE POLICY elite_applications_select_own
  ON public.elite_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS elite_applications_insert_own ON public.elite_applications;
CREATE POLICY elite_applications_insert_own
  ON public.elite_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- The guard trigger — the load-bearing part
-- ---------------------------------------------------------------------------
-- Structurally identical to `guard_shop_settlement_change()` in
-- 009_security_hardening.sql, and deliberately so: same early-return on "no
-- change", same `auth.uid() IS NULL` service-role bypass, same admin-role pass,
-- same `ERRCODE = '42501'`, same REVOKE. A reader who understands one
-- understands both, and the trusted paths (the admin review route here, the
-- payout route there) keep working for the same reason.
--
-- SECURITY DEFINER is required, not decorative: the role lookup reads
-- `public.profiles`, whose RLS would otherwise hide the caller's own row from
-- the trigger and leave `caller_role` NULL for admins.
--
-- Note it fires on `UPDATE OF` these columns, not on every update. A normal
-- shop edit never names them in its SET list, so it does not fire at all —
-- which is what keeps the storefront's own save path untouched.

CREATE OR REPLACE FUNCTION public.guard_shop_elite_change()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  IF
    NEW.is_elite IS NOT DISTINCT FROM OLD.is_elite
    AND NEW.is_verified IS NOT DISTINCT FROM OLD.is_verified
    AND NEW.is_featured IS NOT DISTINCT FROM OLD.is_featured
  THEN
    RETURN NEW;
  END IF;

  -- Service-role bypass: the trusted path used by the admin review route.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Elite, verified and featured status are set by GreenPack review only'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

REVOKE EXECUTE ON FUNCTION public.guard_shop_elite_change() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_shop_elite ON public.shops;
CREATE TRIGGER trg_guard_shop_elite
  BEFORE UPDATE OF
    is_elite,
    is_verified,
    is_featured
  ON public.shops
  FOR EACH ROW EXECUTE PROCEDURE public.guard_shop_elite_change();

-- ---------------------------------------------------------------------------
-- On the two badge columns, and why they are in this trigger
-- ---------------------------------------------------------------------------
-- `is_verified` and `is_featured` had the *identical* hole before this
-- migration: same policy with no WITH CHECK, same body spread, same absence of
-- a guard. A vendor could already grant themselves a "Certified" pill with
-- `PUT /api/shops/<their-shop>` and `{"is_verified": true}`. Nothing in the app
-- writes either column through a vendor-facing path — the badge is meant to be
-- set by review, exactly like elite — so closing them here changes no working
-- behaviour and fixes a live privilege-escalation bug.
--
-- This is the one part of this migration that is separable: to ship the elite
-- tier without it, delete these three column names from the `BEFORE UPDATE OF`
-- list above and the two matching `AND` lines in the early-return. Everything
-- else in the file stands on its own.
