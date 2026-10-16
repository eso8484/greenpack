import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * The vendor's side of the elite tier: read your own application, and apply.
 *
 * There is deliberately no PATCH and no DELETE here, and there is deliberately
 * no UPDATE policy on `elite_applications` either (see 018_elite_vendors.sql).
 * A vendor can put a case forward and read what came back; approving, rejecting,
 * or editing a pitch already under review all go through the service role in
 * `/api/admin/vendors/[applicationId]`. A vendor cannot approve themselves even
 * with a hand-built request, because the database has no path for it.
 *
 * Nothing here writes `shops.is_elite`. Only the admin route does, and the guard
 * trigger on `shops` lets only the service role and an admin role past.
 */

const MIN_PITCH = 80;

const ApplySchema = z.object({
  // Long enough to be a case rather than a keyword: the reviewer is deciding
  // whether to hand this shop homepage placement, and "please" is not a pitch.
  pitch: z.string().trim().min(MIN_PITCH).max(2000),
});

const APPLICATION_COLUMNS =
  "id, status, pitch, review_note, created_at, reviewed_at";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Same resolution as `/api/seller/shop`: the owner's earliest shop. A shop
    // created during a failed onboarding attempt is still their shop, and an
    // application needs one to point at.
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("id, name, is_elite")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (shopError) throw shopError;
    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Set up your shop profile before applying" },
        { status: 404 }
      );
    }

    const { data: application, error: applicationError } = await supabase
      .from("elite_applications")
      .select(APPLICATION_COLUMNS)
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (applicationError) throw applicationError;

    return NextResponse.json({
      success: true,
      data: {
        shop: {
          id: shop.id,
          name: shop.name,
          isElite: shop.is_elite ?? false,
        },
        application: application ?? null,
      },
    });
  } catch (err) {
    console.error("GET /api/seller/elite", err);
    return NextResponse.json(
      { success: false, error: "Failed to load your application" },
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
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // A malformed or absent body reads as a validation failure, not a crash.
    const body = await request.json().catch(() => null);
    const parsed = ApplySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tell us about your business in at least " +
            `${MIN_PITCH} characters so we have something to review.`,
        },
        { status: 400 }
      );
    }

    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("id, is_elite")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (shopError) throw shopError;
    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Set up your shop profile before applying" },
        { status: 404 }
      );
    }

    if (shop.is_elite) {
      return NextResponse.json(
        {
          success: false,
          error: "Your shop is already an Elite Partner — there is nothing to apply for.",
        },
        { status: 409 }
      );
    }

    // `owner_id` is written from the session, never from the body, which is the
    // whole point of it being denormalised onto this table: the RLS INSERT
    // policy checks it directly, so a forged `owner_id` cannot file an
    // application against someone else's shop.
    const { data: application, error: insertError } = await supabase
      .from("elite_applications")
      .insert({
        shop_id: shop.id,
        owner_id: user.id,
        pitch: parsed.data.pitch,
      })
      .select(APPLICATION_COLUMNS)
      .single();

    if (insertError) {
      // 23505 = unique_violation, from the partial index that allows one
      // *pending* application per shop. This is a double-submit (a second tab,
      // an impatient second tap), not a failure worth alarming anyone about.
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "You already have an application under review.",
          },
          { status: 409 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({ success: true, data: application }, { status: 201 });
  } catch (err) {
    console.error("POST /api/seller/elite", err);
    return NextResponse.json(
      { success: false, error: "Failed to submit your application" },
      { status: 500 }
    );
  }
}
