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

// Pending first, then oldest-first inside each status. The review queue is a
// to-do list before it is a record, so anything awaiting a decision has to sort
// above everything already decided — otherwise a backlog sinks below the
// approved rows it is supposed to be sitting on top of.
//
// `status` is a plain text column, so ordering it in SQL would sort
// alphabetically (approved, pending, rejected) and put the queue last. The
// database orders by `created_at` and the rank is applied here instead; the
// sort is stable, so the date order the query established survives inside each
// group.
const STATUS_RANK: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };

export async function GET(request: Request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const validStatuses = ["pending", "approved", "rejected"];

    let query = admin
      .from("elite_applications")
      .select(
        "id, shop_id, owner_id, status, pitch, review_note, created_at, reviewed_at, reviewed_by"
      )
      .order("created_at", { ascending: true });

    if (status && validStatuses.includes(status)) {
      query = query.eq("status", status);
    }

    const { data: applications, error: applicationsError } = await query;
    if (applicationsError) throw applicationsError;

    const applicationList = applications ?? [];
    if (applicationList.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Applicant and reviewer are both `profiles` rows, and the shop is what the
    // reviewer actually judges — so both are fetched in one round trip each
    // rather than per row. This is why the endpoint uses the service role: the
    // reviewer needs to read shops they do not own, and `elite_applications`
    // has no admin SELECT policy by design (008 and 012 exist because
    // role-checking subqueries inside adjacent RLS policies recurse).
    const profileIds = Array.from(
      new Set(
        applicationList
          .flatMap((application) => [application.owner_id, application.reviewed_by])
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );
    const shopIds = Array.from(new Set(applicationList.map((a) => a.shop_id)));

    const [profilesResult, shopsResult] = await Promise.all([
      admin.from("profiles").select("id, full_name, phone, email, role").in("id", profileIds),
      admin
        .from("shops")
        .select("id, name, slug, category_name, is_elite, is_verified, rating, review_count")
        .in("id", shopIds),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (shopsResult.error) throw shopsResult.error;

    const profileById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
    const shopById = new Map((shopsResult.data ?? []).map((shop) => [shop.id, shop]));

    const data = applicationList
      .map((application) => ({
        ...application,
        shop: shopById.get(application.shop_id) ?? null,
        applicant: profileById.get(application.owner_id) ?? null,
        reviewer: application.reviewed_by
          ? profileById.get(application.reviewed_by) ?? null
          : null,
      }))
      .sort((a, b) => (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/admin/vendors", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch elite applications" },
      { status: 500 }
    );
  }
}
