import { NextResponse } from "next/server";
import type { Product, Service, Shop } from "@/types";
import { dbGetShops } from "@/lib/db";

type SearchResultType = "shop" | "service" | "product";

interface SearchResult {
  id: string;
  type: SearchResultType;
  relevance: number;
  shopName?: string;
  data: Shop | Service | Product;
}

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_project_url";

function scoreMatch(query: string, weightedFields: Array<{ value?: string; weight: number }>) {
  const normalized = query.toLowerCase();
  let score = 0;

  for (const field of weightedFields) {
    const value = field.value?.toLowerCase();
    if (!value) continue;
    if (value.includes(normalized)) score += field.weight;
  }

  return score;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapServiceRow(row: any): Service {
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
function mapProductRow(row: any): Product {
  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    description: row.description ?? "",
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    image: row.image ?? "https://placehold.co/400x400/16a34a/white?text=Product",
    categoryId: row.category_id ?? "",
    inStock: row.in_stock ?? true,
    quantity: row.quantity,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();

    if (!query) {
      return NextResponse.json({ success: true, data: [] });
    }

    const shops = await dbGetShops({ query, limit: 40 });
    const results: SearchResult[] = shops
      .map((shop) => ({
        id: shop.id,
        type: "shop" as const,
        data: shop,
        relevance: scoreMatch(query, [
          { value: shop.name, weight: 10 },
          { value: shop.description, weight: 5 },
          { value: shop.shortDescription, weight: 5 },
          { value: shop.categoryName, weight: 3 },
          { value: shop.tags.join(" "), weight: 7 },
          { value: `${shop.location.address} ${shop.location.city}`, weight: 2 },
        ]),
      }))
      .filter((result) => result.relevance > 0);

    if (!SUPABASE_CONFIGURED) {
      const [{ services }, { products }] = await Promise.all([
        import("@/lib/data/services"),
        import("@/lib/data/products"),
      ]);

      const shopById = new Map(shops.map((shop) => [shop.id, shop]));
      for (const service of services) {
        const relevance = scoreMatch(query, [
          { value: service.name, weight: 10 },
          { value: service.description, weight: 5 },
        ]);
        if (relevance > 0) {
          results.push({
            id: service.id,
            type: "service",
            data: service,
            relevance,
            shopName: shopById.get(service.shopId)?.name,
          });
        }
      }

      for (const product of products) {
        const relevance = scoreMatch(query, [
          { value: product.name, weight: 10 },
          { value: product.description, weight: 5 },
        ]);
        if (relevance > 0) {
          results.push({
            id: product.id,
            type: "product",
            data: product,
            relevance,
            shopName: shopById.get(product.shopId)?.name,
          });
        }
      }

      results.sort((a, b) => b.relevance - a.relevance);
      return NextResponse.json({ success: true, data: results });
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const [servicesRes, productsRes] = await Promise.all([
      supabase
        .from("services")
        .select("id, shop_id, name, description, price, price_type, duration, category_id, image, is_available, shops(name)")
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(60),
      supabase
        .from("products")
        .select("id, shop_id, name, description, price, original_price, image, category_id, in_stock, quantity, shops(name)")
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(60),
    ]);

    if (servicesRes.error) throw servicesRes.error;
    if (productsRes.error) throw productsRes.error;

    for (const row of servicesRes.data ?? []) {
      const service = mapServiceRow(row);
      const relevance = scoreMatch(query, [
        { value: service.name, weight: 10 },
        { value: service.description, weight: 5 },
      ]);

      if (relevance > 0) {
        results.push({
          id: service.id,
          type: "service",
          data: service,
          relevance,
          shopName: (row.shops as { name?: string } | null)?.name,
        });
      }
    }

    for (const row of productsRes.data ?? []) {
      const product = mapProductRow(row);
      const relevance = scoreMatch(query, [
        { value: product.name, weight: 10 },
        { value: product.description, weight: 5 },
      ]);

      if (relevance > 0) {
        results.push({
          id: product.id,
          type: "product",
          data: product,
          relevance,
          shopName: (row.shops as { name?: string } | null)?.name,
        });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error("GET /api/search", err);
    return NextResponse.json({ success: false, error: "Failed to run search" }, { status: 500 });
  }
}
