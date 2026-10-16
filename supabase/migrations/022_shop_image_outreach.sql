-- ============================================================================
-- 022_shop_image_outreach.sql
-- The send ledger for vendor image-outreach emails.
--
-- Why a table: the admin panel's job is "email the vendors whose shops are
-- missing images, and do not email the same one twice by accident". That second
-- half needs memory. There is nowhere to put it on `shops` — the column census
-- is 29 columns and none of them is a send timestamp, and a single timestamp
-- would answer "when did we last write" but not "how many times, and to which
-- address". This is one row per email actually sent.
--
-- Why not a counter on the shop: an address changes. The ledger has to record
-- what we sent *to*, not what the profile says today, or a bounce is
-- unattributable after the fact.
--
-- Additive and idempotent. Seeds nothing, deletes nothing.
--
-- ⚠️ Apply this before deploying the outreach page. The GET handler reads this
-- table; a missing table makes the query error, and the page renders as an
-- empty queue — which reads as "no unlisted shops" rather than as a fault. That
-- is the same class of trap as migration 021 (see CLAUDE.md).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The table
-- ---------------------------------------------------------------------------
-- `owner_id` and `sent_by` are both ON DELETE SET NULL rather than CASCADE: the
-- ledger records that an email was *sent*, which stays true after the profile
-- that received or triggered it is gone. Deleting the shop does cascade, because
-- a send about a shop that no longer exists is not a fact worth keeping.
--
-- `to_email` is denormalised on purpose, and it is the one column here that is
-- deliberately not a foreign key to anything.

CREATE TABLE IF NOT EXISTS public.shop_image_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.shop_image_outreach IS
  'One row per vendor image-outreach email actually sent. Written only by POST /api/admin/outreach through the service role, and only after the transport reported success — a failed send leaves no row, so the panel offers it again. Read by the admin panel to show who has already been emailed.';
COMMENT ON COLUMN public.shop_image_outreach.to_email IS
  'The address the email actually went to — profiles.email at send time, captured rather than joined. Deliberately denormalised: the profile address can change, and a bounced send must stay attributable to the address that received it. Never shops.contact.email, and never the split vendor''s internal auth address.';
COMMENT ON COLUMN public.shop_image_outreach.sent_by IS
  'The admin who pressed the button. NULL after that profile is deleted — the send still happened.';

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------
-- The panel's only read is "the latest send per shop", joined against the
-- unlisted shops. `(shop_id, sent_at DESC)` serves that directly: the index
-- answers the lookup and the ordering in one pass, so the first row per shop is
-- the newest one.

CREATE INDEX IF NOT EXISTS idx_shop_image_outreach_shop
  ON public.shop_image_outreach (shop_id, sent_at DESC);

-- ---------------------------------------------------------------------------
-- RLS — enabled, with NO policies
-- ---------------------------------------------------------------------------
-- Deliberately policy-free, and that is a different shape from migration 020.
-- 020 grants owners SELECT on their own generations because the vendor's own
-- quota reads that table. Nothing vendor-facing reads this one: outreach is an
-- internal admin action, and a vendor learning they are about to be reminded is
-- not a feature.
--
-- Every write goes through createAdminClient() (service_role), which bypasses
-- RLS. So an INSERT policy here would be unused configuration *and* a standing
-- channel to forge "already emailed" rows — which is exactly the state that
-- makes the panel skip a vendor who was never contacted. Enabling RLS with no
-- policies is the safe direction: the anon and authenticated roles can do
-- nothing at all with this table.
--
-- There is no is_test column: the test send writes no row, because it is not
-- outreach. A column nothing writes would be config that looks load-bearing.

ALTER TABLE public.shop_image_outreach ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Verification (run by hand; not executed by this migration)
-- ---------------------------------------------------------------------------
-- Confirm the table exists before opening the panel — a missing table renders
-- as an empty queue rather than as an error:
--
--   SELECT to_regclass('public.shop_image_outreach');
--
-- Who has been emailed, newest first:
--
--   SELECT s.name, o.to_email, o.sent_at
--   FROM public.shop_image_outreach o
--   JOIN public.shops s ON s.id = o.shop_id
--   ORDER BY o.sent_at DESC;
--
-- How many of the unlisted shops are still untouched — the number the panel's
-- "never emailed" count should agree with:
--
--   SELECT count(*)
--   FROM public.shops s
--   WHERE NOT s.images_complete
--     AND NOT EXISTS (SELECT 1 FROM public.shop_image_outreach o WHERE o.shop_id = s.id);
