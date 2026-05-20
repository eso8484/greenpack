/**
 * POST /api/vendor/register
 *
 * Registers a new vendor account and creates their shop in one atomic call.
 * Intended for the public vendor onboarding form (no prior session required).
 * On success the user is signed in and a session cookie is set.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";
import { verifyOtp } from "@/lib/otp";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const AccountSchema = z.object({
  email: z.string().email().min(5).max(254),
  password: z.string().min(8),
  fullName: z.string().min(1).max(255),
  dateOfBirth: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

const ShopSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  short_description: z.string().optional(),
  category_id: z.string().min(1),
  category_name: z.string().min(1),
  location: z
    .object({
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
    })
    .optional(),
  contact: z
    .object({
      phone: z.string().optional(),
      email: z.string().optional(),
      whatsapp: z.string().optional(),
    })
    .optional(),
  hours: z
    .object({
      open: z.string().optional(),
      close: z.string().optional(),
      days: z.string().optional(),
    })
    .optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});

const RegisterSchema = z.object({
  account: AccountSchema,
  shop: ShopSchema,
});

// ---------------------------------------------------------------------------
// Phone normalizer (Nigerian numbers: 0xxx → +234xxx)
// ---------------------------------------------------------------------------

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const cleaned = raw.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return "+234" + cleaned.slice(1);
  }
  if (cleaned.startsWith("234")) {
    return "+" + cleaned;
  }
  // Already international or non-Nigerian — return as-is (with + if the
  // original started with + but digits-only cleaning removed it)
  return raw.trim().startsWith("+") ? "+" + cleaned : cleaned;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  if (!(await rateLimit(`vendor-register:${clientIp(request)}`, 8, 3600))) {
    return tooManyRequests();
  }

  // 1. Parse + validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { account, shop } = parsed.data;

  // 2. Normalize email
  const email = account.email.toLowerCase().trim();

  const admin = createAdminClient();

  // 3. Verify + consume the OTP (constant-time compare, brute-force capped).
  //    Consuming up front prevents two parallel submissions from both passing,
  //    and the helper enforces single-use.
  const otpResult = await verifyOtp({
    identifier: email,
    type: "email",
    code: account.otp,
    consume: true,
  });
  if (!otpResult.ok) {
    return NextResponse.json(
      {
        success: false,
        error:
          otpResult.reason === "locked"
            ? "Too many incorrect attempts. Please request a new code."
            : "Invalid or expired verification code",
      },
      { status: 401 }
    );
  }

  // 4. Create the auth user (email pre-confirmed since we just verified it)
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName,
        role: "vendor",
      },
    });

  if (authError) {
    if (
      authError.message.toLowerCase().includes("already") ||
      authError.message.toLowerCase().includes("exist")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This email is already registered. Please sign in instead.",
        },
        { status: 409 }
      );
    }
    console.error("POST /api/vendor/register — createUser error:", authError);
    return NextResponse.json(
      { success: false, error: authError.message },
      { status: 500 }
    );
  }

  if (!authData.user) {
    return NextResponse.json(
      { success: false, error: "Failed to create user account" },
      { status: 500 }
    );
  }

  const userId = authData.user.id;

  // 5. Update the auto-created profile row
  const normalizedPhone = normalizePhone(account.phone);

  const profileUpdate: Record<string, unknown> = {
    full_name: account.fullName,
    phone: normalizedPhone,
    role: "vendor", // critical — override the default 'customer' role
    date_of_birth: account.dateOfBirth ?? null,
    email_verified: true,
    phone_verified: false,
    terms_accepted: true,
    terms_accepted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Conditionally add location columns (migration 010). If migration hasn't
  // run yet we retry without them so profile core fields always land.
  const loc = shop.location ?? {};
  if (loc.address?.trim()) profileUpdate.address = loc.address.trim();
  if (loc.city?.trim()) profileUpdate.city = loc.city.trim();
  if (loc.state?.trim()) profileUpdate.state = loc.state.trim();

  const { error: profileError } = await admin
    .from("profiles")
    .update(profileUpdate)
    .eq("id", userId);

  if (profileError) {
    console.error("POST /api/vendor/register — profile update error:", profileError);
    // Retry without optional location columns (migration 010 may not be applied)
    if (
      profileUpdate.address !== undefined ||
      profileUpdate.city !== undefined ||
      profileUpdate.state !== undefined
    ) {
      const fallback = { ...profileUpdate };
      delete fallback.address;
      delete fallback.city;
      delete fallback.state;
      const { error: fallbackError } = await admin
        .from("profiles")
        .update(fallback)
        .eq("id", userId);
      if (fallbackError) {
        console.error("POST /api/vendor/register — profile fallback error:", fallbackError);
        // Non-fatal — user exists; shop creation can still proceed
      }
    }
  }

  // 6. Geocode from address if explicit coords not provided
  let lat = shop.lat ?? null;
  let lng = shop.lng ?? null;
  if ((lat == null || lng == null) && (loc.address || loc.city)) {
    try {
      const geo = await geocodeAddress(
        loc.address ?? "",
        loc.city,
        loc.state
      );
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    } catch (geoErr) {
      // Non-fatal — admins can geocode later; delivery calc falls back to default
      console.warn(
        "POST /api/vendor/register — geocoding failed; continuing without coords:",
        geoErr
      );
    }
  }

  // 7. Insert the shop
  const { error: shopError } = await admin
    .from("shops")
    .insert({
      owner_id: userId,
      name: shop.name,
      slug: shop.slug,
      description: shop.description,
      short_description: shop.short_description,
      category_id: shop.category_id,
      category_name: shop.category_name,
      location: shop.location ?? {},
      contact: shop.contact ?? {},
      hours: shop.hours ?? {},
      lat,
      lng,
    });

  if (shopError) {
    // Duplicate slug — user-recoverable, don't orphan the account
    if (shopError.message.includes("shops_slug_key")) {
      return NextResponse.json(
        {
          success: false,
          error: "That shop URL is taken — pick a different slug.",
        },
        { status: 409 }
      );
    }

    // Any other DB error: demote the user to 'customer' so they have a valid
    // account and can retry the shop creation form rather than being stuck as
    // a vendor without a shop. Deleting the auth user would force them to
    // re-verify their email, which is a worse experience.
    console.error("POST /api/vendor/register — shop insert error:", shopError);
    try {
      await admin
        .from("profiles")
        .update({ role: "customer", updated_at: new Date().toISOString() })
        .eq("id", userId);
    } catch (demoteErr) {
      console.error(
        "POST /api/vendor/register — role demotion after shop failure:",
        demoteErr
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create shop: " + shopError.message },
      { status: 500 }
    );
  }

  // 8. Sign the user in to set session cookies on the response.
  // Uses the server client (SSR-aware, writes cookies via Next.js cookies()).
  // Failure here is non-fatal — the client can fall back to /login.
  try {
    const serverClient = await createClient();
    await serverClient.auth.signInWithPassword({
      email,
      password: account.password,
    });
  } catch (signInErr) {
    console.error(
      "POST /api/vendor/register — session sign-in failed (non-fatal):",
      signInErr
    );
  }

  // 9. Success
  return NextResponse.json({ success: true, role: "vendor", redirect: "/seller/dashboard" });
}
