import { NextResponse } from "next/server";
import { categories } from "@/lib/data/categories";

/**
 * Lightweight autocomplete endpoint for the header + hero search bars.
 *
 * Returns up to 12 suggestions across shops, services, products, and
 * categories — matched against the user's query (partial, case-insensitive).
 * Results are intentionally thin (label/sublabel/href/icon only) so the
 * dropdown stays fast even on slow connections.
 *
 * The full search page at /api/search returns rich Shop/Service/Product
 * objects — this endpoint is purely UI-facing and not a replacement.
 */

export const dynamic = "force-dynamic";

export interface Suggestion {
  type: "shop" | "service" | "product" | "category";
  label: string;
  sublabel?: string;
  href: string;
  icon?: string;
  image?: string;
}

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_project_url";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q") ?? "";
    const query = rawQuery.trim();

    if (query.length < 1) {
      return NextResponse.json({ success: true, data: [] });
    }

    const normalized = query.toLowerCase();

    // Category matches come from the static list — instant, no DB hit.
    const categoryMatches: Suggestion[] = categories
      .filter(
        (cat) =>
          cat.name.toLowerCase().includes(normalized) ||
          cat.slug.toLowerCase().includes(normalized)
      )
      .slice(0, 3)
      .map((cat) => ({
        type: "category",
        label: cat.name,
        sublabel: `${cat.shopCount} shops`,
        href: `/browse?category=${cat.slug}`,
        icon: cat.icon,
      }));

    if (!SUPABASE_CONFIGURED) {
      // Mock fallback — fetch from mock data files.
      const [{ shops }, { services }, { products }] = await Promise.all([
        import("@/lib/data/shops"),
        import("@/lib/data/services"),
        import("@/lib/data/products"),
      ]);

      const shopMatches: Suggestion[] = shops
        .filter(
          (shop) =>
            shop.name.toLowerCase().includes(normalized) ||
            shop.shortDescription?.toLowerCase().includes(normalized) ||
            shop.categoryName?.toLowerCase().includes(normalized) ||
            shop.tags?.some((t) => t.toLowerCase().includes(normalized))
        )
        .slice(0, 6)
        .map((shop) => ({
          type: "shop",
          label: shop.name,
          sublabel: shop.categoryName,
          href: `/shop/${shop.slug || shop.id}`,
          image: shop.images?.thumbnail,
        }));

      const serviceMatches: Suggestion[] = services
        .filter((service) => service.name.toLowerCase().includes(normalized))
        .slice(0, 3)
        .map((service) => {
          const shop = shops.find((s) => s.id === service.shopId);
          return {
            type: "service" as const,
            label: service.name,
            sublabel: shop ? `at ${shop.name}` : undefined,
            href: shop ? `/shop/${shop.slug || shop.id}` : "/browse",
          };
        });

      const productMatches: Suggestion[] = products
        .filter((product) => product.name.toLowerCase().includes(normalized))
        .slice(0, 3)
        .map((product) => {
          const shop = shops.find((s) => s.id === product.shopId);
          return {
            type: "product" as const,
            label: product.name,
            sublabel: shop ? `at ${shop.name}` : undefined,
            href: shop ? `/shop/${shop.slug || shop.id}` : "/browse",
            image: product.image,
          };
        });

      return NextResponse.json({
        success: true,
        data: dedupe([...shopMatches, ...categoryMatches, ...serviceMatches, ...productMatches]),
      });
    }

    // Supabase path. ilike pattern needs %escape% to be safe — we do a
    // light sanitization to strip wildcards the user types in.
    const safeQuery = normalized.replace(/[%_]/g, "\\$&");

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const [shopsRes, servicesRes, productsRes] = await Promise.all([
      supabase
        .from("shops")
        .select("id, slug, name, category_name, images, short_description")
        .or(
          `name.ilike.%${safeQuery}%,short_description.ilike.%${safeQuery}%,category_name.ilike.%${safeQuery}%`
        )
        .limit(6),
      supabase
        .from("services")
        .select("id, name, shops(name, slug)")
        .ilike("name", `%${safeQuery}%`)
        .limit(3),
      supabase
        .from("products")
        .select("id, name, image, shops(name, slug)")
        .ilike("name", `%${safeQuery}%`)
        .limit(3),
    ]);

    const shopMatches: Suggestion[] = (shopsRes.data ?? []).map((row) => {
      const images = row.images as { thumbnail?: string } | null;
      return {
        type: "shop",
        label: row.name,
        sublabel: row.category_name ?? undefined,
        href: `/shop/${row.slug || row.id}`,
        image: images?.thumbnail,
      };
    });

    const serviceMatches: Suggestion[] = (servicesRes.data ?? []).map((row) => {
      const shop = row.shops as { name?: string; slug?: string } | null;
      return {
        type: "service",
        label: row.name,
        sublabel: shop?.name ? `at ${shop.name}` : undefined,
        href: shop?.slug ? `/shop/${shop.slug}` : "/browse",
      };
    });

    const productMatches: Suggestion[] = (productsRes.data ?? []).map((row) => {
      const shop = row.shops as { name?: string; slug?: string } | null;
      return {
        type: "product",
        label: row.name,
        sublabel: shop?.name ? `at ${shop.name}` : undefined,
        href: shop?.slug ? `/shop/${shop.slug}` : "/browse",
        image: typeof row.image === "string" ? row.image : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      data: dedupe([...shopMatches, ...categoryMatches, ...serviceMatches, ...productMatches]),
    });
  } catch (err) {
    console.error("GET /api/search/suggest", err);
    return NextResponse.json({ success: false, error: "Failed to fetch suggestions" }, { status: 500 });
  }
}

/**
 * Strip duplicates by label+type and cap to 12 so the dropdown stays compact.
 */
function dedupe(items: Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const item of items) {
    const key = `${item.type}::${item.label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= 12) break;
  }
  return out;
}
