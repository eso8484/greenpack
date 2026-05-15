import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  paystackCreateSubaccount,
  paystackResolveAccount,
} from "@/lib/paystack";

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
        "id, name, paystack_subaccount_code, settlement_bank_code, settlement_account_number, settlement_account_name"
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
      .select("role")
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
      .select("id, name")
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
    const resolved = await paystackResolveAccount(
      parsed.data.accountNumber,
      parsed.data.bankCode
    );

    // Create the Paystack subaccount — vendor keeps 97% per transaction.
    const subaccount = await paystackCreateSubaccount({
      business_name: shop.name,
      settlement_bank: parsed.data.bankCode,
      account_number: parsed.data.accountNumber,
      percentage_charge: 97,
    });

    const { data: updatedShop, error: updateError } = await supabase
      .from("shops")
      .update({
        paystack_subaccount_code: subaccount.subaccount_code,
        settlement_bank_code: parsed.data.bankCode,
        settlement_account_number: parsed.data.accountNumber,
        settlement_account_name: resolved.account_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shop.id)
      .select(
        "id, paystack_subaccount_code, settlement_bank_code, settlement_account_number, settlement_account_name"
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
