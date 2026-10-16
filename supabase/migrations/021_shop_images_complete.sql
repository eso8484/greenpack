-- ============================================================================
-- 021_shop_images_complete.sql
-- The listing rule: a shop is **displayable only with a thumbnail, a banner,
-- and at least one gallery image**. This migration adds the column the rule is
-- asked in SQL; `shopImagesComplete()` in `src/lib/utils.ts` is its JavaScript
-- twin, and the two must agree.
--
-- Why a generated column and not a trigger or a saved boolean: the rule is a
-- pure function of `images`, which is the only column it reads. Generated means
-- it cannot drift — there is no writer to forget, and no backfill to re-run when
-- the rule changes, because PostgreSQL recomputes it for every existing row the
-- moment the column is added. That last property is the whole point here: shops
-- registered before this rule existed are exactly the ones that need it applied,
-- and this migration hides them without touching a single row.
--
-- Why it must be filtered in SQL rather than in JavaScript: the listing query
-- paginates (`.limit()` / `.range()`). Filtering after the page is fetched
-- returns a short or empty page while more displayable shops sit just past the
-- cut — the visitor sees "no results" on a page that has results. The filter has
-- to run before the cut, which means in SQL.
--
-- ⚠️ The JS twin deliberately counts array *length*, not non-blank entries:
-- `gallery.length >= 1`. `jsonb_array_length` below matches that exactly, so a
-- hand-written API call storing `gallery: [""]` reads as complete to both. The
-- editor filters blanks before saving (`gallery.filter(url => url.trim())`), so
-- this is an edge case rather than the norm — but the two sides agreeing is the
-- invariant that matters, and matching semantics is how it is kept.
--
-- This migration seeds nothing and deletes nothing. It adds one generated column
-- and one index.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The generated column
-- ---------------------------------------------------------------------------
-- `btrim(COALESCE(images ->> 'thumbnail', '')) <> ''` is the SQL spelling of
-- `images?.thumbnail?.trim()`: it treats a missing key, a JSON null, and a
-- whitespace-only string as equally absent, which is what the JS does.
--
-- `jsonb_typeof(images -> 'gallery') = 'array'` is the `Array.isArray()` guard,
-- and it is load-bearing rather than defensive: `images -> 'gallery'` on a
-- non-array (say a string) would make `jsonb_array_length` raise, which would
-- fail the whole SELECT rather than mark the shop incomplete. The typeof test
-- runs first and short-circuits, so a malformed row is simply not displayable.
--
-- The `images IS NOT NULL` clause is redundant against the thumbnail test but
-- keeps the expression readable as "there are images, and they are complete".

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS images_complete boolean
  GENERATED ALWAYS AS (
    images IS NOT NULL
    AND btrim(COALESCE(images ->> 'thumbnail', '')) <> ''
    AND btrim(COALESCE(images ->> 'banner', '')) <> ''
    AND jsonb_typeof(images -> 'gallery') = 'array'
    AND jsonb_array_length(images -> 'gallery') >= 1
  ) STORED;

COMMENT ON COLUMN public.shops.images_complete IS
  'Generated: thumbnail AND banner are non-blank AND gallery is a non-empty array. '
  'The listing rule — see shopImagesComplete() in src/lib/utils.ts, which must agree. '
  'A shop with images_complete = false is saved and editable but not listed.';

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------
-- Partial, because the listing query only ever asks for `= true`: the incomplete
-- rows are never read this way, so indexing them would be dead weight. The
-- ordered columns are included because every listing query orders by
-- `is_elite DESC` then `created_at DESC` (see dbGetShops), so this can serve the
-- sort as well as the filter.
--
-- ⚠️ At the current scale (~26 shops) PostgreSQL will almost certainly choose a
-- sequential scan and ignore this — correctly. It is here for the shape of the
-- query, not for today's row count.

CREATE INDEX IF NOT EXISTS idx_shops_displayable
  ON public.shops (is_elite DESC, created_at DESC)
  WHERE images_complete;

-- ---------------------------------------------------------------------------
-- Verification (run by hand; not executed by this migration)
-- ---------------------------------------------------------------------------
-- How many shops this just hid, and whether any of them is a surprise:
--
--   SELECT images_complete, count(*)
--   FROM public.shops
--   GROUP BY images_complete;
--
-- The specific rows, so an incomplete shop that ought to be live can be chased:
--
--   SELECT id, slug, name,
--          images ->> 'thumbnail' AS thumbnail,
--          images ->> 'banner'    AS banner,
--          jsonb_typeof(images -> 'gallery') AS gallery_type,
--          CASE WHEN jsonb_typeof(images -> 'gallery') = 'array'
--               THEN jsonb_array_length(images -> 'gallery') END AS gallery_len
--   FROM public.shops
--   WHERE NOT images_complete
--   ORDER BY created_at DESC;
