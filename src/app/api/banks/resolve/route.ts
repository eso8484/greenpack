import { NextResponse } from "next/server";
import { z } from "zod";
import { paystackResolveAccount } from "@/lib/paystack";

const ResolveSchema = z.object({
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
  bankCode: z.string().min(1, "Bank code is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ResolveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const resolved = await paystackResolveAccount(
      parsed.data.accountNumber,
      parsed.data.bankCode
    );

    return NextResponse.json({
      success: true,
      data: {
        account_name: resolved.account_name,
        account_number: resolved.account_number,
      },
    });
  } catch (err) {
    console.error("POST /api/banks/resolve", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to resolve account",
      },
      { status: 502 }
    );
  }
}
