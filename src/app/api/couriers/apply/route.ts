import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CourierApplicationSchema = z.object({
  vehicle_type: z.enum(["bike", "car", "bicycle"]),
  nin: z.string().min(11).max(11),
  guarantor_name: z.string().min(2),
  guarantor_phone: z.string().min(10),
  area_of_operation: z.string().optional(),
  availability_hours: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CourierApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check if already applied
    const { data: existing } = await supabase
      .from("couriers")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "You have already applied to be a courier" },
        { status: 409 }
      );
    }

    // Create courier record (pending verification)
    const { data, error } = await supabase
      .from("couriers")
      .insert({
        id: user.id,
        ...parsed.data,
        is_verified: false,
        is_available: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Update profile role to courier (pending)
    await supabase
      .from("profiles")
      .update({ role: "courier" })
      .eq("id", user.id);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/couriers/apply", err);
    return NextResponse.json({ success: false, error: "Failed to submit application" }, { status: 500 });
  }
}
