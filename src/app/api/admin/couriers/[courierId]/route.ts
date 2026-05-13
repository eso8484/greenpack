import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CourierReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(1000).optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const, userId: user.id };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courierId: string }> }
) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { courierId } = await params;
    const body = await request.json();
    const parsed = CourierReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: courier, error: courierError } = await admin
      .from("couriers")
      .select("id, application_status")
      .eq("id", courierId)
      .single();

    if (courierError || !courier) {
      return NextResponse.json({ success: false, error: "Courier application not found" }, { status: 404 });
    }

    const reviewedAt = new Date().toISOString();
    const nextStatus = parsed.data.action === "approve" ? "approved" : "rejected";
    const nextRole = parsed.data.action === "approve" ? "courier" : "customer";

    const { data, error } = await admin
      .from("couriers")
      .update({
        application_status: nextStatus,
        reviewed_at: reviewedAt,
        reviewed_by: access.userId,
        review_note: parsed.data.note ?? null,
        is_verified: parsed.data.action === "approve",
        is_available: parsed.data.action === "approve",
      })
      .eq("id", courierId)
      .select("*")
      .single();

    if (error) throw error;

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        role: nextRole,
        updated_at: reviewedAt,
      })
      .eq("id", courierId);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PATCH /api/admin/couriers/[courierId]", err);
    return NextResponse.json(
      { success: false, error: "Failed to review courier application" },
      { status: 500 }
    );
  }
}
