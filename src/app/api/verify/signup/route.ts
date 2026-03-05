import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email, password, fullName, phone, dateOfBirth, role } =
      await request.json();

    if (!email || !password || !fullName || !phone) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create user via admin API (email already confirmed since we verified it ourselves)
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: role || "customer",
        },
      });

    if (authError) {
      // Handle duplicate email
      if (
        authError.message.toLowerCase().includes("already") ||
        authError.message.toLowerCase().includes("exist")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "This email is already registered. Try logging in instead.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Normalize phone for storage
    const cleaned = phone.replace(/\D/g, "");
    let normalizedPhone = cleaned;
    if (cleaned.startsWith("0") && cleaned.length === 11) {
      normalizedPhone = "+234" + cleaned.slice(1);
    } else if (cleaned.startsWith("234")) {
      normalizedPhone = "+" + cleaned;
    }

    // Update profile with additional fields
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: normalizedPhone,
        role: role || "customer",
        date_of_birth: dateOfBirth || null,
        email_verified: true,
        phone_verified: true,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
    });
  } catch (err) {
    console.error("POST /api/verify/signup", err);
    return NextResponse.json(
      { success: false, error: "Failed to create account" },
      { status: 500 }
    );
  }
}
