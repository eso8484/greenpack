import { z } from "zod";

/**
 * The shop write shape — one definition, because three handlers accept a shop
 * body: `POST`/`PATCH /api/seller/shop` and `PUT /api/shops/[shopId]`. Two of
 * them validated and one did not, and the two that did had already drifted
 * apart — the seller route capped `name` at 255 characters and accepted
 * `images`/`video`/`lat`/`lng`, while the collection route capped it at 2 and
 * accepted none of them. A field could be written through the path that allowed
 * it and then read back through the path that did not.
 *
 * ⚠️ `z.object()` **strips** unknown keys — it is not a passthrough. That is the
 * load-bearing property here, not an accident of the default: `parsed.data` is
 * exactly the set of columns a vendor may write, so a body carrying `rating`,
 * `review_count`, `owner_id`, or `is_verified` has those keys dropped before it
 * ever reaches `.update()`. The PUT used to spread `...body` straight into the
 * update, which made every column on `shops` vendor-writable by key injection —
 * `trg_guard_shop_elite` (migration 018) blocks only `is_elite`, `is_verified`,
 * and `is_featured`, so `rating` and `review_count` were wide open. Switching
 * this to `.passthrough()`, or dropping the `.safeParse` in a handler, reopens
 * exactly that hole.
 *
 * This gates **shape**, never completeness: `images` is optional here and
 * nullable in the database, so a shop with no thumbnail is still saved and still
 * editable — it simply is not listed. See `shopImagesComplete()` in
 * `src/lib/utils.ts` and migration 021. Validation answers "is this a shop
 * body", never "is this shop publishable".
 */
export const CreateShopSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  short_description: z.string().max(500).optional(),
  category_id: z.string().min(1),
  category_name: z.string(),
  location: z.record(z.string(), z.unknown()).optional(),
  contact: z.record(z.string(), z.unknown()).optional(),
  hours: z.record(z.string(), z.unknown()).optional(),
  images: z.record(z.string(), z.unknown()).optional(),
  video: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  // Top-level coordinates. Vendors who clicked "Use My Location" already have
  // these; otherwise we attempt server-side geocoding from location.address.
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
});

/**
 * Every field optional — an update sends whatever the editor holds, and nothing
 * obliges a client to send all of it. `.partial()` also relaxes the two fields
 * `CreateShopSchema` requires, which is what lets the editor leave the category
 * untouched when it has none to send.
 */
export const UpdateShopSchema = CreateShopSchema.partial();
