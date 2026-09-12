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
import { isVendorHost } from "@/lib/hosts";
import { createVendorAccount, normalizeEmail } from "@/lib/vendor-identity";
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
  const email = normalizeEmail(account.email);

  const admin = createAdminClient();

  // 3. Refuse a duplicate shop slug BEFORE creating anything. The account and
  //    the OTP are both single-use, so discovering the clash after creating the
  //    account would burn the code and leave a vendor row the user can neither
  //    reach nor reuse — the retry would then fail with "already exists".
  const { data: slugOwner } = await admin
    .from("shops")
    .select("id")
    .eq("slug", shop.slug)
    .maybeSingle();

  if (slugOwner) {
    return NextResponse.json(
      { success: false, error: "That shop URL is taken — pick a different slug." },
      { status: 409 }
    );
  }

  // 4. Verify + consume the OTP (constant-time compare, brute-force capped).
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

  // 5. Create the vendor account.
  //    This is an account of its own, not a role on the customer row: it gets a
  //    separate auth row, so a customer who registers here keeps their own
  //    password and their own session. See src/lib/vendor-identity.ts. The
  //    email already being a customer account is deliberately not a conflict.
  const vendorResult = await createVendorAccount({
    email,
    password: account.password,
    fullName: account.fullName,
    phone: normalizePhone(account.phone),
    dateOfBirth: account.dateOfBirth ?? null,
    // Conditionally add location columns (migration 010). Harmless if the
    // migration hasn't run — the update retries without them below.
    profileExtra: {
      ...(shop.location?.address?.trim()
        ? { address: shop.location.address.trim() }
        : {}),
      ...(shop.location?.city?.trim() ? { city: shop.location.city.trim() } : {}),
      ...(shop.location?.state?.trim() ? { state: shop.location.state.trim() } : {}),
    },
  });

  if (!vendorResult.ok) {
    return NextResponse.json(
      { success: false, error: vendorResult.message },
      { status: vendorResult.reason === "email_in_use" ? 409 : 500 }
    );
  }

  const { userId, authEmail } = vendorResult;

  // 6. Geocode from address if explicit coords not provided
  let lat = shop.lat ?? null;
  let lng = shop.lng ?? null;
  const loc = shop.location ?? {};
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
    // The pre-flight check above rules out a duplicate slug in practice, but a
    // concurrent registration can still lose the race. The account is real and
    // usable either way — the seller dashboard has a "create your shop" path —
    // so report the clash and leave the account alone.
    console.error("POST /api/vendor/register — shop insert error:", shopError);

    const clashed = shopError.message.includes("shops_slug_key");
    return NextResponse.json(
      {
        success: false,
        error: clashed
          ? "That shop URL is taken — pick a different slug."
          : "Your account was created, but the shop could not be saved: " +
            shopError.message,
      },
      { status: clashed ? 409 : 500 }
    );
  }

  // 8. Sign the user in to set session cookies on the response.
  //    Note the address: for an account created here it is the internal vendor
  //    address, NOT the one the user typed. Signing in with `email` would
  //    authenticate their *customer* account, which is the bug this whole
  //    change exists to fix.
  //    Uses the server client (SSR-aware, writes cookies via Next.js cookies()).
  //    Failure here is non-fatal — the client can fall back to /login.
  try {
    const serverClient = await createClient();
    await serverClient.auth.signInWithPassword({
      email: authEmail,
      password: account.password,
    });
  } catch (signInErr) {
    console.error(
      "POST /api/vendor/register — session sign-in failed (non-fatal):",
      signInErr
    );
  }

  // 9. Success. The dashboard has two addresses — the clean one the vendor host
  //    rewrites, and the /seller path it rewrites it to. Send the browser to
  //    whichever matches the host it is actually on.
  const onVendorHost = isVendorHost(request.headers.get("host"));
  return NextResponse.json({
    success: true,
    role: "vendor",
    redirect: onVendorHost ? "/dashboard" : "/seller/dashboard",
  });
}
