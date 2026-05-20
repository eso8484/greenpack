/**
 * POST /api/courier/register
 *
 * Registers a new courier applicant in one atomic call: creates the auth
 * account, then inserts a pending row in `couriers`. Intended for the public
 * courier onboarding form (no prior session required). On success the user is
 * signed in and a session cookie is set.
 *
 * NOTE: unlike vendor registration, the account role stays "customer". A
 * courier's role is only flipped to "courier" when an admin approves the
 * application (see /api/admin/couriers/[courierId]). Until then the applicant
 * is a normal signed-in customer with a pending application.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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

const CourierSchema = z.object({
  vehicle_type: z.enum(["bike", "car", "bicycle"]),
  nin: z.string().length(11, "NIN must be exactly 11 digits"),
  guarantor_name: z.string().min(2).max(255),
  guarantor_phone: z.string().min(10).max(20),
  area_of_operation: z.string().max(255).optional(),
  availability_hours: z.string().max(255).optional(),
});

const RegisterSchema = z.object({
  account: AccountSchema,
  courier: CourierSchema,
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
  return raw.trim().startsWith("+") ? "+" + cleaned : cleaned;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  if (!(await rateLimit(`courier-register:${clientIp(request)}`, 8, 3600))) {
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

  const { account, courier } = parsed.data;
  const email = account.email.toLowerCase().trim();

  const admin = createAdminClient();

  // 2. Verify + consume the OTP (constant-time compare, brute-force capped,
  //    single-use). Consuming up front also blocks parallel-submission reuse.
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

  // 3. Create the auth user (email pre-confirmed since we just verified it).
  //    Role stays "customer" — courier role is granted on admin approval.
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName,
        role: "customer",
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
          error: "This email is already registered. Please sign in instead.",
        },
        { status: 409 }
      );
    }
    console.error("POST /api/courier/register — createUser error:", authError);
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

  // 4. Update the auto-created profile row
  const normalizedPhone = normalizePhone(account.phone);

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: account.fullName,
      phone: normalizedPhone,
      role: "customer",
      date_of_birth: account.dateOfBirth ?? null,
      email_verified: true,
      phone_verified: false,
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    console.error("POST /api/courier/register — profile update error:", profileError);
    // Non-fatal — the account exists; application can still proceed.
  }

  // 5. Insert the courier application (pending admin review).
  const { error: courierError } = await admin.from("couriers").insert({
    id: userId,
    vehicle_type: courier.vehicle_type,
    nin: courier.nin,
    guarantor_name: courier.guarantor_name,
    guarantor_phone: normalizePhone(courier.guarantor_phone) ?? courier.guarantor_phone,
    area_of_operation: courier.area_of_operation ?? null,
    availability_hours: courier.availability_hours ?? null,
    application_status: "pending",
    is_verified: false,
    is_available: false,
  });

  if (courierError) {
    // The account is a valid "customer" — no rollback needed. The applicant
    // can re-apply from /become-courier while signed in.
    console.error("POST /api/courier/register — courier insert error:", courierError);
    return NextResponse.json(
      {
        success: false,
        error:
          "Account created, but we couldn't submit your courier application. Please sign in and try again from the Become a Courier page.",
      },
      { status: 500 }
    );
  }

  // 6. Sign the user in to set session cookies. Non-fatal on failure.
  try {
    const serverClient = await createClient();
    await serverClient.auth.signInWithPassword({
      email,
      password: account.password,
    });
  } catch (signInErr) {
    console.error(
      "POST /api/courier/register — session sign-in failed (non-fatal):",
      signInErr
    );
  }

  // 7. Success — application is pending admin review.
  return NextResponse.json({ success: true, status: "pending" });
}
