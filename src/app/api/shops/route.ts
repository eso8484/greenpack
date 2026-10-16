import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateShopSchema } from "@/lib/shop-schema";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const query = searchParams.get("q");
    const sort = searchParams.get("sort") ?? "newest";
    const verified = searchParams.get("verified") === "true";
    const featured = searchParams.get("featured") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let dbQuery = supabase
      .from("shops")
      .select("*", { count: "exact" });

    if (category) dbQuery = dbQuery.eq("category_id", category);
    if (verified) dbQuery = dbQuery.eq("is_verified", true);
    if (featured) dbQuery = dbQuery.eq("is_featured", true);
    if (query) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query}%,description.ilike.%${query}%,short_description.ilike.%${query}%`
      );
    }

    // The display rule. Last of the filters and deliberately ahead of the
    // `.range()` below: this endpoint paginates, so filtering after the cut
    // would return a short page while displayable shops sit just past it.
    // `images_complete` is the generated column from migration 021; the mock
    // twin is shopImagesComplete() in utils.ts.
    dbQuery = dbQuery.eq("images_complete", true);

    switch (sort) {
      case "rating":
        dbQuery = dbQuery.order("rating", { ascending: false });
        break;
      case "newest":
      default:
        dbQuery = dbQuery.order("created_at", { ascending: false });
        break;
    }

    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;

    if (error) throw error;

    return NextResponse.json({ success: true, data, count });
  } catch (err) {
    console.error("GET /api/shops", err);
    return NextResponse.json({ success: false, error: "Failed to fetch shops" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateShopSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("shops")
      .insert({ ...parsed.data, owner_id: user.id })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/shops", err);
    return NextResponse.json({ success: false, error: "Failed to create shop" }, { status: 500 });
  }
}
