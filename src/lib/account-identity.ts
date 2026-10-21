/**
 * Role-scoped registration identity.
 *
 * Registration asks one question before it does anything expensive — "does this
 * address already belong to an account *in the lane being applied for*?" — and
 * the answer decides whether the form may proceed to the OTP. It is deliberately
 * **one column per lane**, because the three accounts a person can hold are not
 * the same account:
 *
 *   customer  the person's own account, on the address they typed
 *   vendor    a separate account, filed under an internal address
 *             (see src/lib/vendor-identity.ts) but visible under the typed one
 *   courier   NOT an account of its own — a courier's account *is* their
 *             customer account, with `profiles.role` flipped on approval
 *
 * So a customer account is a conflict on the customer lane and no conflict at
 * all on the courier lane. Getting that backwards is what told existing
 * customers they were "already registered" when they applied to deliver.
 *
 * Two shapes are exported:
 *   - `checkRegistrationEmail()` — the gate in front of the OTP. Returns a
 *     refusal or a go-ahead, and says when a customer account will be reused.
 *   - `findConsumerAccount()` — the id of that reusable customer account, for
 *     the courier route that attaches an application to it.
 *
 * Both read through `createAdminClient()`, because the caller is a signed-out
 * registration form: there is no session to satisfy RLS with, and `profiles` is
 * not world-readable.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { findVendorIdentity, normalizeEmail } from "@/lib/vendor-identity";

export type RegistrationRole = "customer" | "vendor" | "courier";

export type RegistrationEmailCheck =
  | { ok: true; existingAccount: boolean }
  | { ok: false; status: number; error: string };

const MSG = {
  vendor:
    "This email already has a vendor account. Sign in at the vendor centre instead.",
  courier:
    "This email already has a courier account. Sign in to your courier dashboard.",
  courierPending:
    "This email already has a courier application under review. Sign in to track it.",
  account: "This email already has a GreenPack account. Sign in instead.",
  admin:
    "We can't complete this registration with that email. Try a different address, or contact support at support@greenpackdelight.com.",
  unavailable:
    "We couldn't check this email just now. Please try again in a moment.",
} as const;

interface ProfileClaim {
  id: string;
  role: string | null;
}

/** Every profile claiming the visible address — normally 0-2 rows. */
async function profileClaims(email: string): Promise<ProfileClaim[] | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, role")
    .eq("email", email);

  if (error) {
    console.error("account-identity — profile lookup failed:", error);
    return null;
  }
  return (data ?? []) as ProfileClaim[];
}

/**
 * The most advanced courier application among these accounts, or null.
 *
 * A **rejected** application is deliberately not a conflict:
 * `/api/couriers/apply` re-opens one on re-submission, and the day it is
 * rejected is exactly when the applicant is most likely to fix it and try
 * again.
 */
async function courierApplicationState(
  userIds: string[]
): Promise<"approved" | "pending" | null> {
  if (userIds.length === 0) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("couriers")
    .select("application_status")
    .in("id", userIds);

  if (error) {
    console.error("account-identity — courier lookup failed:", error);
    return null;
  }

  const statuses = (data ?? []).map((row) => row.application_status);
  if (statuses.includes("approved")) return "approved";
  if (statuses.includes("pending")) return "pending";
  return null;
}

export interface ConsumerAccount {
  /** `profiles.id`, which is also the courier's id — `couriers.id` references it. */
  userId: string;
  fullName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
}

/**
 * The customer account that owns this address, if one does.
 *
 * Non-null only when a `profiles` row with `role = 'customer'` claims the address
 * **and** that row's auth user is actually keyed on it. The second half matters:
 * a split vendor's profile also carries the visible address, but its auth row
 * lives on `v.<uuid>@vendors…`. Attaching a courier application to a vendor
 * account would put the delivery work under the wrong login entirely.
 */
export async function findConsumerAccount(
  email: string
): Promise<ConsumerAccount | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, phone, date_of_birth")
    .eq("role", "customer")
    .eq("email", normalized)
    .limit(1);

  if (error) {
    console.error("findConsumerAccount — profile lookup failed:", error);
    return null;
  }

  const profile = data?.[0];
  if (!profile) return null;

  const { data: authUser, error: authError } =
    await admin.auth.admin.getUserById(profile.id);
  const authEmail = authUser?.user?.email;
  if (authError || !authEmail) {
    console.error("findConsumerAccount — auth lookup failed:", authError);
    return null;
  }

  if (normalizeEmail(authEmail) !== normalized) return null;

  return {
    userId: profile.id,
    fullName: profile.full_name ?? null,
    phone: profile.phone ?? null,
    dateOfBirth: profile.date_of_birth ?? null,
  };
}

/**
 * The pre-OTP gate. One column per lane.
 *
 * Returns a refusal with the status the route should answer with, or a go-ahead
 * — plus `existingAccount`, which is true when the courier lane will attach the
 * application to a customer account that already exists (so the form can say so
 * *before* the code is sent, rather than surprising them afterwards).
 */
export async function checkRegistrationEmail(
  email: string,
  role: RegistrationRole
): Promise<RegistrationEmailCheck> {
  const normalized = normalizeEmail(email);
  // The route validates the shape before calling this; an empty value has
  // nothing to conflict with.
  if (!normalized) return { ok: true, existingAccount: false };

  const claims = await profileClaims(normalized);
  if (claims === null) {
    return { ok: false, status: 500, error: MSG.unavailable };
  }

  // An admin address is never confirmed. Answering "that is an admin" would
  // turn the registration form into a directory of the console's operators, so
  // this refusal is generic and comes before the lane rules.
  if (claims.some((row) => row.role === "admin")) {
    return { ok: false, status: 403, error: MSG.admin };
  }

  const vendor = await findVendorIdentity(normalized);

  // A vendor registered before migration 017 still owns the typed address in
  // `auth.users` — the split never reached them. A role filter alone would let
  // the registration through and then collide after the code was consumed,
  // which is the exact defect this check exists to prevent.
  const legacyVendorOwnsAddress = !!vendor && !vendor.split;

  if (role === "vendor") {
    if (vendor) {
      return { ok: false, status: 409, error: MSG.vendor };
    }
    return { ok: true, existingAccount: false };
  }

  if (role === "courier") {
    if (claims.some((row) => row.role === "courier")) {
      return { ok: false, status: 409, error: MSG.courier };
    }

    const application = await courierApplicationState(
      claims.map((row) => row.id)
    );
    if (application === "approved") {
      return { ok: false, status: 409, error: MSG.courier };
    }
    if (application === "pending") {
      return { ok: false, status: 409, error: MSG.courierPending };
    }

    if (legacyVendorOwnsAddress) {
      return { ok: false, status: 409, error: MSG.vendor };
    }

    // A plain customer account is not a conflict here — it is the account the
    // application will be attached to. Say so now, before the OTP.
    const consumer = await findConsumerAccount(normalized);
    return { ok: true, existingAccount: !!consumer };
  }

  // Customer lane.
  if (claims.some((row) => row.role === "customer" || row.role === "courier")) {
    return { ok: false, status: 409, error: MSG.account };
  }
  if (legacyVendorOwnsAddress) {
    return { ok: false, status: 409, error: MSG.vendor };
  }

  return { ok: true, existingAccount: false };
}
