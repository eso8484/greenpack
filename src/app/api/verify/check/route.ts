import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { identifier, code, type } = await request.json();

    if (!identifier || !code || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["email", "phone"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid type" },
        { status: 400 }
      );
    }

    // Normalize identifier
    let normalizedId = identifier;
    if (type === "email") {
      normalizedId = identifier.toLowerCase();
    } else {
      // Normalize phone
      const cleaned = identifier.replace(/\D/g, "");
      if (cleaned.startsWith("0") && cleaned.length === 11) {
        normalizedId = "234" + cleaned.slice(1);
      } else if (cleaned.startsWith("234")) {
        normalizedId = cleaned;
      } else {
        normalizedId = cleaned;
      }
    }

    const supabase = createAdminClient();

    // Find valid OTP
    const { data: otp } = await supabase
      .from("verification_otps")
      .select("*")
      .eq("identifier", normalizedId)
      .eq("type", type)
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otp) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired code. Please try again." },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await supabase
      .from("verification_otps")
      .update({ used: true })
      .eq("id", otp.id);

    return NextResponse.json({ success: true, verified: true });
  } catch (err) {
    console.error("POST /api/verify/check", err);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
