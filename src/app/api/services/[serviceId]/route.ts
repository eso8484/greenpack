import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const UpdateServiceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullish(),
  price: z.number().positive().optional(),
  price_type: z.enum(["fixed", "from", "hourly", "starting_from", "per_hour"]).optional(),
  duration: z.string().nullish(),
  image: z.string().nullish(),
  gallery: z.array(z.string()).optional(),
  category_id: z.string().nullish(),
  is_available: z.boolean().optional(),
  service_type: z.enum(["in_home", "pickup_return", "in_store"]).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("services")
      .select("id, shops!inner(owner_id)")
      .eq("id", serviceId)
      .single();

    const ownerId = (existing?.shops as { owner_id: string } | null | undefined)?.owner_id;
    if (!existing || ownerId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("services")
      .update({ ...parsed.data })
      .eq("id", serviceId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PUT /api/services/[serviceId]", err);
    return NextResponse.json({ success: false, error: "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from("services")
      .select("id, shops!inner(owner_id)")
      .eq("id", serviceId)
      .single();

    const ownerId = (existing?.shops as { owner_id: string } | null | undefined)?.owner_id;
    if (!existing || ownerId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("services").delete().eq("id", serviceId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/services/[serviceId]", err);
    return NextResponse.json({ success: false, error: "Failed to delete service" }, { status: 500 });
  }
}
