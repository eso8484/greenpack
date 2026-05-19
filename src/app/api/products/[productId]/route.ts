import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Explicit allow-list — anything not listed here (shop_id, id, owner-only flags)
// cannot be set by the vendor. Mass assignment of these would let a vendor
// reparent a product into another shop or stomp creation timestamps.
const UpdateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullish(),
  price: z.number().positive().optional(),
  original_price: z.number().positive().nullish(),
  image: z.string().nullish(),
  gallery: z.array(z.string()).optional(),
  category_id: z.string().nullish(),
  in_stock: z.boolean().optional(),
  quantity: z.number().int().min(0).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify ownership explicitly (RLS would also enforce this, but we want a
    // clear 403 instead of an opaque "not found").
    const { data: existing } = await supabase
      .from("products")
      .select("id, shops!inner(owner_id)")
      .eq("id", productId)
      .single();

    const ownerId = (existing?.shops as { owner_id: string } | null | undefined)?.owner_id;
    if (!existing || ownerId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("products")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", productId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PUT /api/products/[productId]", err);
    return NextResponse.json({ success: false, error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from("products")
      .select("id, shops!inner(owner_id)")
      .eq("id", productId)
      .single();

    const ownerId = (existing?.shops as { owner_id: string } | null | undefined)?.owner_id;
    if (!existing || ownerId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/products/[productId]", err);
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 });
  }
}
