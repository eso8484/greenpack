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
    },
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
        row.images?.thumbnail ??
        "https://placehold.co/400x300/16a34a/white?text=Shop",
      banner:
        row.images?.banner ??
        "https://placehold.co/1200x400/16a34a/white?text=Banner",
      gallery: row.images?.gallery ?? [],
    },
    video: {
      url: row.video?.url ?? "",
      thumbnail: row.video?.thumbnail ?? "",
    },
    tags: row.tags ?? [],
    isVerified: row.is_verified ?? false,
    isFeatured: row.is_featured ?? false,
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
    image: row.image,
    isAvailable: row.is_available ?? true,
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
      row.image ??
      "https://placehold.co/400x400/16a34a/white?text=Product",
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
  categoryId?: string | null;
  sortBy?: string;
  verifiedOnly?: boolean;
  featured?: boolean;
  limit?: number;
}): Promise<Shop[]> {
  if (!SUPABASE_CONFIGURED) {
    const { shops } = await import("./data/shops");
    const { filterShops } = await import("./utils");
    return filterShops(shops, {
      query: filters?.query ?? "",
      categoryId: filters?.categoryId ?? null,
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
  if (filters?.categoryId) dbQuery = dbQuery.eq("category_id", filters.categoryId);
  if (filters?.verifiedOnly) dbQuery = dbQuery.eq("is_verified", true);
  if (filters?.featured) dbQuery = dbQuery.eq("is_featured", true);

  if (filters?.sortBy === "rating") {
    dbQuery = dbQuery.order("rating", { ascending: false });
  } else {
    dbQuery = dbQuery.order("created_at", { ascending: false });
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

  let { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("id", shopId)
    .maybeSingle();

  if (!data && !error) {
    ({ data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("slug", shopId)
      .maybeSingle());
  }

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
