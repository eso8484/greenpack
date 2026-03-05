import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return "+234" + cleaned.slice(1);
  }
  if (cleaned.startsWith("234")) return "+" + cleaned;
  if (cleaned.startsWith("+234")) return cleaned;
  return cleaned;
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(phone);
    const supabase = createAdminClient();

    // Look up profile by phone number
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", normalized)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "No account found with this phone number" },
        { status: 404 }
      );
    }

    // Get user email from auth
    const { data: userData } = await supabase.auth.admin.getUserById(
      profile.id
    );

    if (!userData?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Account error. Please try email login." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email: userData.user.email,
    });
  } catch (err) {
    console.error("POST /api/verify/phone-lookup", err);
    return NextResponse.json(
      { success: false, error: "Lookup failed" },
      { status: 500 }
    );
  }
}
