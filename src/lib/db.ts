/**
 * Database access layer — maps Supabase snake_case rows to the app's camelCase types.
 * Falls back to mock data when Supabase is not configured.
 */

import type { Shop, Service, Product, Review } from "@/types";

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_project_url";

// ─── Row mappers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapShop(row: any): Shop {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    shortDescription: row.short_description ?? "",
    categoryId: row.category_id ?? "",
    categoryName: row.category_name ?? "",
    owner: row.owner_id ?? "",
    rating: Number(row.rating) || 0,
    reviewCount: row.review_count || 0,
    location: {
      address: row.location?.address ?? "",
      city: row.location?.city ?? "",
      state: row.location?.state ?? "",
      lat: row.lat != null ? Number(row.lat) : undefined,
      lng: row.lng != null ? Number(row.lng) : undefined,
    },
    flutterwave_subaccount_id: row.flutterwave_subaccount_id ?? null,
    settlement_bank_code: row.settlement_bank_code ?? null,
    settlement_account_number: row.settlement_account_number ?? null,
    settlement_account_name: row.settlement_account_name ?? null,
    contact: {
      phone: row.contact?.phone ?? "",
      email: row.contact?.email ?? "",
      whatsapp: row.contact?.whatsapp,
    },
    hours: {
      open: row.hours?.open ?? "9:00 AM",
      close: row.hours?.close ?? "6:00 PM",
      days: row.hours?.days ?? "Mon – Sat",
    },
    images: {
      thumbnail:
        row.images?.thumbnail ||
        "https://placehold.co/400x300/16a34a/white?text=Shop",
      banner:
        row.images?.banner ||
        "https://placehold.co/1200x400/16a34a/white?text=Banner",
      gallery: Array.isArray(row.images?.gallery) ? row.images.gallery : [],
    },
    video: {
      url: row.video?.url || "",
      thumbnail: row.video?.thumbnail || "",
    },
    tags: row.tags ?? [],
    isVerified: row.is_verified ?? false,
    isFeatured: row.is_featured ?? false,
    isElite: row.is_elite ?? false,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapService(row: any): Service {
  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    description: row.description ?? "",
    price: Number(row.price),
    priceType: row.price_type ?? "fixed",
    duration: row.duration,
    categoryId: row.category_id ?? "",
    image: row.image || undefined,
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    isAvailable: row.is_available ?? true,
    service_type: row.service_type ?? "in_store",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(row: any): Product {
  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    description: row.description ?? "",
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    image:
      row.image ||
      "https://placehold.co/400x400/16a34a/white?text=Product",
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    categoryId: row.category_id ?? "",
    inStock: row.in_stock ?? true,
    quantity: row.quantity,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReview(row: any): Review {
  return {
    id: row.id,
    shopId: row.shop_id,
    customerName: row.customer_name,
    customerAvatar: row.customer_avatar,
    rating: row.rating,
    comment: row.comment ?? "",
    date: row.created_at ?? new Date().toISOString(),
  };
}

// ─── Query functions ──────────────────────────────────────────────────────────

export async function dbGetShops(filters?: {
  query?: string;
  /**
   * The member ids of whichever category scope is active. A leaf arrives as a
   * one-element array; a group arrives as all of its leaves. One field rather
   * than a `categoryId` plus a `categoryIds`, so there is no way to set both
   * and have to decide which wins down here.
   */
  categoryIds?: string[] | null;
  city?: string;
  sortBy?: string;
  verifiedOnly?: boolean;
  featured?: boolean;
  elite?: boolean;
  limit?: number;
}): Promise<Shop[]> {
  if (!SUPABASE_CONFIGURED) {
    const { shops } = await import("./data/shops");
    const { filterShops } = await import("./utils");
    return filterShops(shops, {
      query: filters?.query ?? "",
      categoryIds: filters?.categoryIds ?? null,
      sortBy:
        (filters?.sortBy as
          | "relevance"
          | "rating"
          | "price_low"
          | "price_high"
          | "newest") ?? "relevance",
      verifiedOnly: filters?.verifiedOnly ?? false,
    });
  }

  const { createClient } = await import("./supabase/server");
  const supabase = await createClient();

  let dbQuery = supabase.from("shops").select("*");

  if (filters?.query) {
    dbQuery = dbQuery.or(
      `name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`
    );
  }
  if (filters?.categoryIds?.length) {
    dbQuery = dbQuery.in("category_id", filters.categoryIds);
  }
  if (filters?.verifiedOnly) dbQuery = dbQuery.eq("is_verified", true);
  if (filters?.featured) dbQuery = dbQuery.eq("is_featured", true);
  if (filters?.elite) dbQuery = dbQuery.eq("is_elite", true);
  if (filters?.city) {
    dbQuery = dbQuery.or(
      `location->>city.ilike.%${filters.city}%,location->>state.ilike.%${filters.city}%`
    );
  }

  // The display rule: a shop needs a thumbnail, a banner, and at least one
  // gallery image to be listed. In SQL, not in JS — `.limit()` below cuts the
  // page, and filtering after the cut would hand back a short or empty page while
  // more displayable shops sit just past it. `images_complete` is the generated
  // column from migration 021; `shopImagesComplete()` in utils.ts is its twin and
  // the mock path's half of this same rule, so the two must agree.
  dbQuery = dbQuery.eq("images_complete", true);

  // Elite is the primary key, the requested sort the secondary — so an elite shop
  // leads under every sort while each tier keeps the order the visitor asked for.
  // PostgREST applies chained `.order()` calls in sequence, which is the multi-key
  // sort this needs (there is no cross-call transaction to lean on, and none is
  // needed). With nothing approved every row is `is_elite = false`, so this
  // collapses to exactly the previous single-key ordering.
  if (filters?.sortBy === "rating") {
    dbQuery = dbQuery
      .order("is_elite", { ascending: false })
      .order("rating", { ascending: false });
  } else {
    dbQuery = dbQuery
      .order("is_elite", { ascending: false })
      .order("created_at", { ascending: false });
  }

  if (filters?.limit) dbQuery = dbQuery.limit(filters.limit);

  const { data, error } = await dbQuery;
  if (error || !data) return [];
  return data.map(mapShop);
}

export async function dbGetShopById(shopId: string): Promise<Shop | null> {
  if (!SUPABASE_CONFIGURED) {
    const { getShopById } = await import("./utils");
    return getShopById(shopId) ?? null;
  }

  const { createClient } = await import("./supabase/server");
  const supabase = await createClient();

  // Detect UUID up front. The previous "try id, fall back to slug" pattern
  // broke for slug lookups because Postgres raises an `invalid_text_representation`
  // error when a non-UUID string is compared against the UUID-typed id column,
  // and we were treating any non-null error as "give up" instead of falling
  // back to the slug. Result: every clicked search suggestion 404'd.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopId);

  if (isUuid) {
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .maybeSingle();
    if (!error && data) return mapShop(data);
    // Fall through to slug lookup — extremely unlikely (a slug that looks
    // like a UUID), but cheap to cover.
  }

  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("slug", shopId)
    .maybeSingle();

  if (error || !data) return null;
  return mapShop(data);
}

export async function dbGetServicesByShopId(shopId: string): Promise<Service[]> {
  if (!SUPABASE_CONFIGURED) {
    const { getServicesByShopId } = await import("./utils");
    return getServicesByShopId(shopId);
  }

  const { createClient } = await import("./supabase/server");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapService);
}

export async function dbGetProductsByShopId(shopId: string): Promise<Product[]> {
  if (!SUPABASE_CONFIGURED) {
    const { getProductsByShopId } = await import("./utils");
    return getProductsByShopId(shopId);
  }

  const { createClient } = await import("./supabase/server");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapProduct);
}

export async function dbGetReviewsByShopId(shopId: string): Promise<Review[]> {
  if (!SUPABASE_CONFIGURED) {
    const { getReviewsByShopId } = await import("./utils");
    return getReviewsByShopId(shopId);
  }

  const { createClient } = await import("./supabase/server");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapReview);
}

export async function dbGetFeaturedShops(): Promise<Shop[]> {
  return dbGetShops({ featured: true, limit: 8 });
}
