import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  paystackCreateTransferRecipient,
  paystackResolveAccount,
} from "@/lib/paystack";

const PayoutSchema = z.object({
  bankCode: z.string().min(1, "Bank code is required"),
  bankName: z.string().min(1, "Bank name is required"),
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

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "role, bank_name, bank_code, account_number, account_name, paystack_recipient_code"
      )
      .eq("id", user.id)
      .single();

    if (error) throw error;
    if (!profile || !["courier", "admin"].includes(profile.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (err) {
    console.error("GET /api/courier/payout", err);
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
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || !["courier", "admin"].includes(profile.role)) {
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

    // Verify the account belongs to a real holder
    const resolved = await paystackResolveAccount(
      parsed.data.accountNumber,
      parsed.data.bankCode
    );

    // Create a transfer recipient so we can later disburse earnings
    const recipient = await paystackCreateTransferRecipient({
      name: resolved.account_name || profile.full_name || "Courier",
      account_number: parsed.data.accountNumber,
      bank_code: parsed.data.bankCode,
    });

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        bank_name: parsed.data.bankName,
        bank_code: parsed.data.bankCode,
        account_number: parsed.data.accountNumber,
        account_name: resolved.account_name,
        paystack_recipient_code: recipient.recipient_code,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select(
        "bank_name, bank_code, account_number, account_name, paystack_recipient_code"
      )
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, data: updatedProfile });
  } catch (err) {
    console.error("POST /api/courier/payout", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save payout details",
      },
      { status: 500 }
    );
  }
}
