import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const {
      email,
      password,
      fullName,
      phone,
      dateOfBirth,
      role,
      address,
      city,
      state,
      lat,
      lng,
    } = await request.json();

    if (!email || !password || !fullName) {
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

    // Normalize phone for storage when provided.
    let normalizedPhone: string | null = null;
    if (typeof phone === "string" && phone.trim()) {
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.startsWith("0") && cleaned.length === 11) {
        normalizedPhone = "+234" + cleaned.slice(1);
      } else if (cleaned.startsWith("234")) {
        normalizedPhone = "+" + cleaned;
      } else {
        normalizedPhone = cleaned;
      }
    }

    // Update profile with additional fields. Location columns (address/lat/lng)
    // are nullable per migration 010 — if the migration hasn't been applied
    // yet they'll silently fail (logged below) without blocking signup.
    const profileUpdate: Record<string, unknown> = {
      full_name: fullName,
      phone: normalizedPhone,
      role: role || "customer",
      date_of_birth: dateOfBirth || null,
      email_verified: true,
      phone_verified: false,
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (typeof address === "string" && address.trim()) {
      profileUpdate.address = address.trim();
    }
    if (typeof city === "string" && city.trim()) {
      profileUpdate.city = city.trim();
    }
    if (typeof state === "string" && state.trim()) {
      profileUpdate.state = state.trim();
    }
    const numericLat = typeof lat === "number" ? lat : Number(lat);
    const numericLng = typeof lng === "number" ? lng : Number(lng);
    if (Number.isFinite(numericLat) && numericLat >= -90 && numericLat <= 90) {
      profileUpdate.lat = numericLat;
    }
    if (Number.isFinite(numericLng) && numericLng >= -180 && numericLng <= 180) {
      profileUpdate.lng = numericLng;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Retry without optional location columns in case migration 010 hasn't
      // been applied yet — signup must not fail just because we couldn't
      // persist coordinates.
      if (
        profileUpdate.address !== undefined ||
        profileUpdate.lat !== undefined ||
        profileUpdate.lng !== undefined
      ) {
        const fallback = { ...profileUpdate };
        delete fallback.address;
        delete fallback.city;
        delete fallback.state;
        delete fallback.lat;
        delete fallback.lng;
        await supabase
          .from("profiles")
          .update(fallback)
          .eq("id", authData.user.id);
      }
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
