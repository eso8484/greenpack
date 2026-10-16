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

    // `couriers.id` IS the applicant's user id — the apply route inserts
    // `id: user.id` (src/app/api/couriers/apply/route.ts). So an admin who once
    // submitted the courier form has a row here keyed on their own uuid, and a
    // reject would run the profile write below against the reviewer. That is not
    // hypothetical: it demoted this project's only admin to `customer` on
    // 2026-10-16, which the middleware's `hideIfUnauthorized` then rendered as a
    // permanent 404 on every `/admin/*` path. Refuse it before parsing anything.
    if (courierId === access.userId) {
      return NextResponse.json(
        { success: false, error: "You cannot review your own application." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
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

    // A courier review only ever legitimately moves a profile between the two
    // roles it owns. Read first, write only if the current role is one of them:
    // `profiles.role` is a single column, so an unconditional write would wipe a
    // `vendor` or `admin` role from anyone who happened to use the courier form.
    // Approved-and-also-a-vendor is a schema question, not a route patch — the
    // approval is still recorded on the `couriers` row either way.
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", courierId)
      .maybeSingle();

    const canSetRole =
      !!targetProfile &&
      (targetProfile.role === "customer" || targetProfile.role === "courier");

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

    if (canSetRole) {
      const { error: profileError } = await admin
        .from("profiles")
        .update({
          role: nextRole,
          updated_at: reviewedAt,
        })
        .eq("id", courierId);

      if (profileError) throw profileError;
    }

    // `roleUpdated` is additive: `data` stays the courier row, so existing
    // callers are unaffected. It reports the one thing the panel cannot infer.
    return NextResponse.json({ success: true, data, roleUpdated: canSetRole });
  } catch (err) {
    console.error("PATCH /api/admin/couriers/[courierId]", err);
    return NextResponse.json(
      { success: false, error: "Failed to review courier application" },
      { status: 500 }
    );
  }
}
