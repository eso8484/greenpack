-- ============================================================================
-- 020_shop_image_generations.sql
-- The usage ledger for AI-generated shop images.
--
-- Why a table and not a counter: the whole reason this feature is safe to ship
-- is a per-vendor daily cap, and a cap needs something durable to count. One row
-- per generation is that something — it also answers "what has this cost me"
-- directly, which is the question a paid image model raises and a text model
-- does not (there is no free image tier on OpenRouter, unlike the support
-- assistant's `:free` text model).
--
-- Cost shape is deliberately the opposite of the support chat's: that runs once
-- per visitor message, this runs only when a vendor chooses to generate. So the
-- exposure is bounded by vendors × cap × price-per-image, not by traffic.
--
-- Additive and idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shop_image_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Nullable, and SET NULL rather than CASCADE: a vendor may generate a
  -- thumbnail before their shop row exists (the editor creates it on first
  -- save), and deleting a shop must not erase the record of what was spent.
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  model text,
  -- What the provider reported for this generation (`usage.cost`), when it
  -- reported one. Advisory analytics, not billing truth — the provider's own
  -- dashboard is that. Nullable because a provider may omit it.
  cost_usd numeric(10, 6),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shop_image_generations IS
  'One row per AI-generated shop image. Read-only for the vendor who owns it; every write goes through the service role in /api/seller/shop/image, which is what makes the daily cap trustworthy.';
COMMENT ON COLUMN public.shop_image_generations.cost_usd IS
  'The per-generation cost the provider reported (usage.cost). Analytics only — never used to charge anyone, and never trusted over the provider''s own billing.';

-- The cap query is "count this owner's rows since <24h ago>", so the index
-- matches it exactly: owner first, then time descending. Without this the count
-- is a scan over every generation ever made, on every page load of the shop
-- editor (the client GETs usage on mount).
CREATE INDEX IF NOT EXISTS idx_shop_image_generations_owner_created
  ON public.shop_image_generations (owner_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS — owner SELECT only
-- ---------------------------------------------------------------------------
-- Deliberately narrower than `elite_applications` in 018, which grants the owner
-- INSERT as well. There, the vendor-facing route writes with the *user-session*
-- client, so the INSERT policy is load-bearing. Here every write goes through
-- `createAdminClient()`, which bypasses RLS — so an INSERT policy would be
-- unused configuration, and an unused INSERT policy on this table is not
-- harmless: it would be a standing channel for a vendor to write arbitrary rows
-- straight to PostgREST, including rows that inflate or forge their own usage.
--
-- No UPDATE policy and no DELETE policy, for the same reason 018 gives, plus one
-- specific to this table: a vendor who could delete their own rows could reset
-- the daily cap at will, which is exactly the bound this table exists to hold.
--
-- The service role bypasses RLS entirely, so the route needs no policy to write.

ALTER TABLE public.shop_image_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shop_image_generations_select_own ON public.shop_image_generations;
CREATE POLICY shop_image_generations_select_own
  ON public.shop_image_generations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);
