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
      .select("id, application_status")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      if (existing.application_status === "approved") {
        return NextResponse.json(
          { success: false, error: "Your courier account is already approved" },
          { status: 409 }
        );
      }

      if (existing.application_status === "pending") {
        return NextResponse.json(
          { success: false, error: "Your courier application is still under review" },
          { status: 409 }
        );
      }

      // Re-open rejected applications as pending when applicant re-submits.
      const { data, error } = await supabase
        .from("couriers")
        .update({
          ...parsed.data,
          application_status: "pending",
          review_note: null,
          reviewed_at: null,
          reviewed_by: null,
          is_available: false,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data }, { status: 202 });
    }

    // Create courier record (pending admin approval)
    const { data, error } = await supabase
      .from("couriers")
      .insert({
        id: user.id,
        ...parsed.data,
        application_status: "pending",
        is_verified: false,
        is_available: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/couriers/apply", err);
    return NextResponse.json({ success: false, error: "Failed to submit application" }, { status: 500 });
  }
}
