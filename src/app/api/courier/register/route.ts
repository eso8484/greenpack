/**
 * POST /api/courier/register
 *
 * Registers a courier applicant from the public onboarding form (no prior
 * session required) and sets a session cookie so the applicant lands signed in.
 *
 * NOTE: unlike vendor registration, the account role stays "customer". A
 * courier's role is only flipped to "courier" when an admin approves the
 * application (see /api/admin/couriers/[courierId]). Until then the applicant
 * is a normal signed-in customer with a pending application.
 *
 * **One email, one account — so a courier application attaches.** A courier has
 * no separate identity: their courier account *is* their customer account. And
 * `auth.users.email` is unique, so a second auth row for an address that already
 * has one can never exist. When the address belongs to an existing customer,
 * then, the only way to "register them as a courier" is to put the application
 * on the account that already owns the address — which is exactly what
 * `/api/couriers/apply` does for a signed-in visitor. This route therefore
 * resolves first and then either creates or attaches.
 *
 * Three consequences of attaching are load-bearing:
 *
 *   1. **The typed password is discarded, never applied.** Setting it on the
 *      existing account would silently change a customer's password from a
 *      courier application form — including on a typo. The OTP has already
 *      proved control of the mailbox, so a session is minted the way a password
 *      reset mints one, and the existing password is left alone.
 *   2. **Their profile is not overwritten.** Name, phone, and date of birth are
 *      filled only where blank.
 *   3. **The UI is told.** The response carries `attached`, so the page can say
 *      what happened rather than leave them guessing why "their" password
 *      does not work.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyOtp } from "@/lib/otp";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import { findConsumerAccount } from "@/lib/account-identity";

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
  nin: z.string().regex(/^\d{11}$/, "NIN must be exactly 11 digits"),
  guarantor_name: z.string().min(2).max(255),
  guarantor_phone: z.string().min(10).max(20),
  area_of_operation: z.string().max(255).optional(),
  availability_hours: z.string().max(255).optional(),
});

const RegisterSchema = z.object({
  account: AccountSchema,
  courier: CourierSchema,
});

type CourierApplication = z.infer<typeof CourierSchema>;
type AdminClient = ReturnType<typeof createAdminClient>;

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
// The courier application, keyed on the applicant's account id
// ---------------------------------------------------------------------------

type SubmitResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Inserts the pending `couriers` row for `userId`, mirroring
 * `/api/couriers/apply` branch for branch so the two entry points agree:
 * approved → 409, under review → 409, rejected → reopen as pending.
 */
async function submitCourierApplication(
  admin: AdminClient,
  userId: string,
  courier: CourierApplication,
  failureMessage: string,
  retryOnConflict = true
): Promise<SubmitResult> {
  const payload = {
    vehicle_type: courier.vehicle_type,
    nin: courier.nin,
    guarantor_name: courier.guarantor_name,
    guarantor_phone: normalizePhone(courier.guarantor_phone) ?? courier.guarantor_phone,
    area_of_operation: courier.area_of_operation ?? null,
    availability_hours: courier.availability_hours ?? null,
  };

  const { data: existing, error: readError } = await admin
    .from("couriers")
    .select("application_status")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    console.error("POST /api/courier/register — courier lookup error:", readError);
    return { ok: false, status: 500, error: failureMessage };
  }

  if (existing) {
    if (existing.application_status === "approved") {
      return {
        ok: false,
        status: 409,
        error: "Your courier account is already approved",
      };
    }
    if (existing.application_status === "pending") {
      return {
        ok: false,
        status: 409,
        error: "Your courier application is still under review",
      };
    }

    // Re-open a rejected application — the day it is rejected is exactly when
    // the applicant is most likely to fix it and come back.
    const { error: updateError } = await admin
      .from("couriers")
      .update({
        ...payload,
        application_status: "pending",
        review_note: null,
        reviewed_at: null,
        reviewed_by: null,
        is_available: false,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("POST /api/courier/register — courier reopen error:", updateError);
      return { ok: false, status: 500, error: failureMessage };
    }
    return { ok: true };
  }

  const { error: insertError } = await admin.from("couriers").insert({
    id: userId,
    ...payload,
    application_status: "pending",
    is_verified: false,
    is_available: false,
  });

  if (!insertError) return { ok: true };

  // Lost the race with a second submission for the same account. `couriers.nin`
  // carries no unique constraint, so the only key that can raise 23505 here is
  // the primary key — the applicant's own id — which makes this unambiguous.
  // Re-read and apply the same branches rather than 500 the applicant.
  if (insertError.code === "23505" && retryOnConflict) {
    return submitCourierApplication(admin, userId, courier, failureMessage, false);
  }

  console.error("POST /api/courier/register — courier insert error:", insertError);
  return { ok: false, status: 500, error: failureMessage };
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

  // 3. Does this address already belong to a customer account?
  //    Asked *after* the OTP so a stranger cannot probe it, and *after* the
  //    precheck in /api/verify/send-email has already refused the cases that
  //    genuinely conflict.
  const existingAccount = await findConsumerAccount(email);

  let userId: string;
  const attached = existingAccount !== null;

  if (existingAccount) {
    userId = existingAccount.userId;
  } else {
    // Create the auth user (email pre-confirmed since we just verified it).
    // Role stays "customer" — courier role is granted on admin approval.
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
        // The precheck and findConsumerAccount() both key on `profiles.email`,
        // so a profile whose email is NULL — created before migration 017 and
        // missed by the backfill — is invisible to both. The OTP is spent by
        // now, so this must say what to do next rather than dead-end.
        return NextResponse.json(
          {
            success: false,
            error:
              "This email already has a GreenPack account. Sign in with it and apply from your dashboard — your courier application will be attached.",
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

    userId = authData.user.id;
  }

  // 4. Profile row.
  //    A freshly created row is ours to fill. An existing customer's row is
  //    not: replacing their saved name and phone number because they applied to
  //    deliver would be real data loss, so blanks are filled and nothing else.
  const normalizedPhone = normalizePhone(account.phone);

  const profileUpdate: Record<string, unknown> = attached
    ? {
        full_name: existingAccount.fullName || account.fullName,
        phone: existingAccount.phone || normalizedPhone,
        date_of_birth: existingAccount.dateOfBirth || account.dateOfBirth || null,
        email_verified: true,
        updated_at: new Date().toISOString(),
      }
    : {
        full_name: account.fullName,
        phone: normalizedPhone,
        role: "customer",
        date_of_birth: account.dateOfBirth ?? null,
        email_verified: true,
        phone_verified: false,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

  const { error: profileError } = await admin
    .from("profiles")
    .update(profileUpdate)
    .eq("id", userId);

  if (profileError) {
    console.error("POST /api/courier/register — profile update error:", profileError);
    // Non-fatal — the account exists; application can still proceed.
  }

  // 5. The courier application (pending admin review).
  const submitResult = await submitCourierApplication(
    admin,
    userId,
    courier,
    attached
      ? "We couldn't attach your courier application to your existing account. Please sign in and try again from the Become a Courier page."
      : "Account created, but we couldn't submit your courier application. Please sign in and try again from the Become a Courier page."
  );

  if (!submitResult.ok) {
    return NextResponse.json(
      { success: false, error: submitResult.error },
      { status: submitResult.status }
    );
  }

  // 6. Set session cookies. Non-fatal on failure — the application row exists.
  let signedIn = false;
  try {
    const serverClient = await createClient();

    if (attached) {
      // Mint a session without touching the stored password. Same pattern as
      // /api/auth/callback: sign out locally first (never "global" — that would
      // revoke this person's refresh token on every host), then exchange a
      // one-time token for a session.
      await serverClient.auth.signOut({ scope: "local" });
      const { data: link } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      const hashedToken = link?.properties?.hashed_token;
      if (hashedToken) {
        const { error: verifyError } = await serverClient.auth.verifyOtp({
          type: "magiclink",
          token_hash: hashedToken,
        });
        signedIn = !verifyError;
        if (verifyError) {
          console.error(
            "POST /api/courier/register — attach sign-in failed (non-fatal):",
            verifyError
          );
        }
      }
    } else {
      const { error: signInError } = await serverClient.auth.signInWithPassword({
        email,
        password: account.password,
      });
      signedIn = !signInError;
      if (signInError) {
        console.error(
          "POST /api/courier/register — session sign-in failed (non-fatal):",
          signInError
        );
      }
    }
  } catch (signInErr) {
    console.error(
      "POST /api/courier/register — session sign-in threw (non-fatal):",
      signInErr
    );
  }

  // 7. Success — application is pending admin review.
  return NextResponse.json({
    success: true,
    status: "pending",
    attached,
    signedIn,
  });
}
