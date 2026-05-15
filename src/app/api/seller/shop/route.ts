import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateShopSchema = z.object({
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
});

const UpdateShopSchema = CreateShopSchema.partial();

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["vendor", "admin"].includes(profile.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data: shop, error } = await supabase
      .from("shops")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!shop) {
      return NextResponse.json(
        { success: false, error: "No shop profile found for this seller" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: shop });
  } catch (err) {
    console.error("GET /api/seller/shop", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch seller shop" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is customer or vendor
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    // Body validation
    const body = await request.json();
    const parsed = CreateShopSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check if shop already exists for this user
    const { data: existingShop } = await supabase
      .from("shops")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existingShop) {
      return NextResponse.json(
        { success: false, error: "User already has a shop" },
        { status: 409 }
      );
    }

    // Create shop
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .insert({
        owner_id: user.id,
        ...parsed.data,
      })
      .select()
      .single();

    if (shopError) throw shopError;

    // Flip role from customer to vendor if not already vendor/admin
    if (profile.role === "customer") {
      const { error: roleError } = await supabase
        .from("profiles")
        .update({ role: "vendor", updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (roleError) throw roleError;
    }

    return NextResponse.json({ success: true, data: shop }, { status: 201 });
  } catch (err) {
    console.error("POST /api/seller/shop", err);
    return NextResponse.json(
      { success: false, error: "Failed to create shop" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["vendor", "admin"].includes(profile.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Body validation
    const body = await request.json();
    const parsed = UpdateShopSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Get user's shop
    const { data: shop, error: shopFetchError } = await supabase
      .from("shops")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (shopFetchError) throw shopFetchError;
    if (!shop) {
      return NextResponse.json(
        { success: false, error: "No shop found for this vendor" },
        { status: 404 }
      );
    }

    // Update shop
    const { data: updatedShop, error: updateError } = await supabase
      .from("shops")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shop.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, data: updatedShop });
  } catch (err) {
    console.error("PATCH /api/seller/shop", err);
    return NextResponse.json(
      { success: false, error: "Failed to update shop" },
      { status: 500 }
    );
  }
}
