-- ============================================================================
-- 019_backfill_shop_category_ids.sql
-- Repairs a data defect in the seed: `005_security_hardening_and_demo_data.sql`
-- inserts its demo shop with `category_id = 'laundry'` — the category **slug** —
-- while every real registration stores the category **id** (`cat-1`) and
-- `/browse?category=laundry` resolves slug→id and then filters on `cat-1`.
--
-- Where that bites: any database built from the migrations, because 005 seeds
-- those rows on the way up. Their consequence there: the rows are invisible to
-- category browse, while still appearing in unfiltered `/browse` and on
-- `/shop/<slug>`, since nothing else reads `category_id` — so the defect is
-- silent rather than loud.
--
-- ⚠️ Verified against the live project on 2026-10-05, and it is **clean**: all
-- 26 shops already carry `cat-*` ids, and `services`/`products.category_id` are
-- NULL. The three seeded shops (`express-laundry`, `quick-dry-cleaning`,
-- `premium-wash`) do not exist there at all — deleted, or seeded by a revision
-- of 005 that predates the demo block. **So this migration is expected to be a
-- no-op in production**, and its value is on the fresh-database path. The
-- verification query is recorded in the project notes; re-run it rather than
-- trusting this comment if it matters.
--
-- This migration rewrites any `category_id` that holds a known slug into the
-- matching id. It seeds nothing and deletes nothing.
--
-- ⚠️ The slug→id map below is a snapshot of `src/lib/data/categories.ts` as of
-- this migration. The taxonomy lives in TypeScript, not in Postgres, so there
-- is no foreign key to enforce this and no way for SQL to read the list — if a
-- slug is renamed in that file, add a follow-up backfill rather than editing
-- this one, which must stay a faithful record of what it did on the day it ran.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The mapping
-- ---------------------------------------------------------------------------
-- All 45 leaves. Groups are excluded on purpose: nothing ever stores a group
-- id on a row — a group is a browse-time view over its leaves — so a group id
-- appearing in `category_id` would be a different bug with a different fix.
--
-- Slugs and ids are disjoint by construction (`src/types/index.ts` records the
-- rule for group slugs; the same holds here), which is what makes this
-- statement idempotent — see below.

-- Deliberately a plain temp table, not `ON COMMIT DROP`: a temp table drops at
-- commit, so under a runner that gives each statement its own transaction the
-- table would vanish before the first UPDATE. `supabase db push` wraps a
-- migration in one transaction and would be fine either way, but a hand-paste
-- into the SQL editor is not guaranteed to. Lifetime here is the session, with
-- an explicit DROP at the end.

CREATE TEMP TABLE IF NOT EXISTS _category_slug_to_id (
  slug text PRIMARY KEY,
  id text NOT NULL
);

INSERT INTO _category_slug_to_id (slug, id) VALUES
    ('laundry', 'cat-1'),
    ('barbershop-salon', 'cat-2'),
    ('phone-repair', 'cat-3'),
    ('fashion', 'cat-4'),
    ('food', 'cat-5'),
    ('home-services', 'cat-6'),
    ('electronics', 'cat-7'),
    ('health-beauty', 'cat-8'),
    ('auto-repair', 'cat-9'),
    ('cleaning-fumigation', 'cat-10'),
    ('catering-baking', 'cat-11'),
    ('groceries', 'cat-12'),
    ('events-rentals', 'cat-13'),
    ('construction', 'cat-14'),
    ('power-solutions', 'cat-15'),
    ('real-estate', 'cat-16'),
    ('building-materials', 'cat-17'),
    ('welding-metal', 'cat-18'),
    ('furniture-decor', 'cat-19'),
    ('water-supply', 'cat-20'),
    ('gas-fuel', 'cat-21'),
    ('security', 'cat-22'),
    ('car-wash', 'cat-23'),
    ('drinks', 'cat-24'),
    ('agriculture', 'cat-25'),
    ('pharmacy', 'cat-26'),
    ('fitness', 'cat-27'),
    ('fabrics', 'cat-28'),
    ('jewelry', 'cat-29'),
    ('cosmetics', 'cat-30'),
    ('shoe-repair', 'cat-31'),
    ('professional-services', 'cat-32'),
    ('education', 'cat-33'),
    ('printing-branding', 'cat-34'),
    ('cyber-cafe', 'cat-35'),
    ('photography', 'cat-36'),
    ('travel-tours', 'cat-37'),
    ('logistics', 'cat-38'),
    ('kids-baby', 'cat-39'),
    ('pets-vet', 'cat-40'),
    ('books-stationery', 'cat-41'),
    ('entertainment', 'cat-42'),
    ('plumbers', 'cat-43'),
    ('electricians', 'cat-44'),
    ('technicians', 'cat-45')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- The backfill
-- ---------------------------------------------------------------------------
-- Idempotent by construction: the join is `stored value = slug`, and every
-- rewritten value is an id. Slugs and ids share no member, so a second run
-- matches nothing. That is deliberately stronger than a `WHERE category_id
-- <> mapped.id` guard, which only proves the write is a no-op, not that the
-- statement cannot drift on re-execution.

-- shops — the one that actually breaks browse.
UPDATE public.shops s
SET category_id = m.id
FROM _category_slug_to_id m
WHERE s.category_id = m.slug;

-- services — same seed, same column, same defect. Nothing reads
-- `services.category_id` today (services are always fetched by `shop_id`), so
-- this changes no behaviour; it stops the column from lying to whatever reads
-- it next, which is the whole point of a backfill.
UPDATE public.services s
SET category_id = m.id
FROM _category_slug_to_id m
WHERE s.category_id = m.slug;

-- products — likewise.
UPDATE public.products p
SET category_id = m.id
FROM _category_slug_to_id m
WHERE p.category_id = m.slug;

DROP TABLE _category_slug_to_id;
