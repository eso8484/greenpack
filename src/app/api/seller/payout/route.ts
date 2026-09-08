import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  flutterwaveCreateSubaccount,
  flutterwaveResolveAccount,
} from "@/lib/flutterwave";

const PayoutSchema = z.object({
  bankCode: z.string().min(1, "Bank code is required"),
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["vendor", "admin"].includes(profile.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data: shop, error } = await supabase
      .from("shops")
      .select(
        "id, name, flutterwave_subaccount_id, settlement_bank_code, settlement_account_number, settlement_account_name"
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!shop) {
      return NextResponse.json(
        { success: false, error: "No shop profile found for this seller" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: shop });
  } catch (err) {
    console.error("GET /api/seller/payout", err);
    return NextResponse.json(
      { success: false, error: "Failed to load payout details" },
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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, phone")
      .eq("id", user.id)
      .single();

    if (!profile || !["vendor", "admin"].includes(profile.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = PayoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("id, name, contact")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (shopError) throw shopError;
    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Create your shop profile before setting up payouts" },
        { status: 404 }
      );
    }

    // Resolve the account so we have a verified holder name
    const resolved = await flutterwaveResolveAccount(
      parsed.data.accountNumber,
      parsed.data.bankCode
    );

    const shopPhone =
      shop.contact &&
      typeof shop.contact === "object" &&
      "phone" in shop.contact &&
      typeof shop.contact.phone === "string"
        ? shop.contact.phone
        : null;
    const businessMobile = shopPhone || profile.phone;
    if (!businessMobile) {
      return NextResponse.json(
        {
          success: false,
          error: "Add a contact phone number to your shop or profile before setting up payouts.",
        },
        { status: 400 }
      );
    }

    // Flutterwave subaccounts receive the vendor's share of each checkout.
    const subaccount = await flutterwaveCreateSubaccount({
      businessName: shop.name,
      accountBank: parsed.data.bankCode,
      accountNumber: parsed.data.accountNumber,
      businessMobile,
    });

    // Use admin client: settlement fields are guarded by a BEFORE UPDATE trigger
    // (migration 009) that rejects non-admin writes. This route already authn'd
    // and authz'd the caller above, so this is the trusted path.
    const admin = createAdminClient();
    const { data: updatedShop, error: updateError } = await admin
      .from("shops")
      .update({
        flutterwave_subaccount_id: subaccount.subaccount_id,
        settlement_bank_code: parsed.data.bankCode,
        settlement_account_number: parsed.data.accountNumber,
        settlement_account_name: resolved.account_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shop.id)
      .eq("owner_id", user.id)
      .select(
        "id, flutterwave_subaccount_id, settlement_bank_code, settlement_account_number, settlement_account_name"
      )
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, data: updatedShop });
  } catch (err) {
    console.error("POST /api/seller/payout", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save payout details",
      },
      { status: 500 }
    );
  }
}
