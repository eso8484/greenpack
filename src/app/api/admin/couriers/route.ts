import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function GET(request: Request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const validStatuses = ["pending", "approved", "rejected"];

    let query = admin
      .from("couriers")
      .select(
        "id, vehicle_type, application_status, is_verified, is_available, nin, guarantor_name, guarantor_phone, area_of_operation, availability_hours, created_at, reviewed_at, reviewed_by, review_note"
      )
      .order("created_at", { ascending: true });

    if (status && validStatuses.includes(status)) {
      query = query.eq("application_status", status);
    }

    const { data: couriers, error: couriersError } = await query;
    if (couriersError) throw couriersError;

    const courierList = couriers ?? [];
    if (courierList.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const profileIds = Array.from(
      new Set(
        courierList
          .flatMap((courier) => [courier.id, courier.reviewed_by])
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name, phone, role")
      .in("id", profileIds);

    if (profilesError) throw profilesError;

    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const data = courierList.map((courier) => ({
      ...courier,
      applicant: profileById.get(courier.id) ?? null,
      reviewer: courier.reviewed_by ? (profileById.get(courier.reviewed_by) ?? null) : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/admin/couriers", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch courier applications" },
      { status: 500 }
    );
  }
}
