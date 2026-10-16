import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EliteReviewSchema = z.object({
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
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { applicationId } = await params;
    const body = await request.json().catch(() => null);
    const parsed = EliteReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: application, error: applicationError } = await admin
      .from("elite_applications")
      .select("id, shop_id, status")
      .eq("id", applicationId)
      .single();

    if (applicationError || !application) {
      return NextResponse.json(
        { success: false, error: "Elite application not found" },
        { status: 404 }
      );
    }

    // Only a pending application can be decided. Without this a rejected row
    // could be quietly flipped to approved, and — worse — an approve whose
    // second write failed (leaving the shop already elite) could be followed by
    // a reject that stamps `rejected` on a shop still wearing the pill, with no
    // route in the UI to undo either half. Refusing the second decision keeps
    // every state in the queue reachable from the buttons the queue renders.
    if (application.status !== "pending") {
      return NextResponse.json(
        { success: false, error: `This application has already been ${application.status}.` },
        { status: 409 }
      );
    }

    const reviewedAt = new Date().toISOString();

    // The shop flag is written first, on purpose. These are two PostgREST calls
    // with no transaction spanning them, so one can land without the other; the
    // question is only which half-written state a reviewer is left looking at.
    // Flag-first fails *visible* and *fixable*: the application is still pending,
    // so the queue still renders its Approve/Reject buttons and a retry
    // succeeds. Stamp-first would fail invisible — the row reads "approved"
    // while the shop never got the flag, and the UI offers no action on a
    // decided row, so nothing would ever surface it.
    if (parsed.data.action === "approve") {
      // Service role, so the trigger's `auth.uid() IS NULL` bypass lets this
      // through — the same trusted path `guard_shop_settlement_change()` gives
      // the payout route. A vendor-facing write to this column raises 42501.
      const { error: shopError } = await admin
        .from("shops")
        .update({ is_elite: true, updated_at: reviewedAt })
        .eq("id", application.shop_id);

      if (shopError) throw shopError;
    }

    const { data, error } = await admin
      .from("elite_applications")
      .update({
        status: parsed.data.action === "approve" ? "approved" : "rejected",
        reviewed_at: reviewedAt,
        reviewed_by: access.userId,
        review_note: parsed.data.note ?? null,
        updated_at: reviewedAt,
      })
      .eq("id", applicationId)
      .select("id, shop_id, status, review_note, reviewed_at, reviewed_by")
      .single();

    if (error) throw error;

    // Note the deliberate absence of a `profiles.role` write. Courier approval
    // flips `customer` → `courier` because a courier is a different kind of
    // account. Elite is a property of the *shop*, not of the person: the vendor
    // keeps the same role, the same login, and every route they had before.
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PATCH /api/admin/vendors/[applicationId]", err);
    return NextResponse.json(
      { success: false, error: "Failed to review elite application" },
      { status: 500 }
    );
  }
}
