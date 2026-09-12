/**
 * Vendor account identity.
 *
 * A vendor account is a real account, not a role worn by the customer one. It
 * has its own `auth.users` row, so it has its own password, and signing in on
 * the vendor host can never resolve to the customer row.
 *
 * The catch is that `auth.users.email` is unique, so two accounts cannot both
 * own `user@example.com`. The vendor row is therefore keyed on an internal
 * address — `v.<uuid>@vendors.greenpackdelight.com`, a subdomain with no MX that
 * is never mailed and never shown — while the address the person actually types
 * lives in `profiles.email`, which is deliberately not unique.
 *
 *   customer account  auth.users.email = user@example.com   profiles.email = user@example.com
 *   vendor account    auth.users.email = v.<uuid>@vendors…  profiles.email = user@example.com
 *
 * Nothing outside this module should construct or interpret a vendor auth
 * address. Callers that need one ask for it here.
 */

import { createAdminClient } from "@/lib/supabase/admin";

/** Non-routable domain for vendor auth addresses. No MX record exists for it. */
export const VENDOR_AUTH_DOMAIN = "vendors.greenpackdelight.com";

/**
 * A fresh internal address for a vendor account.
 *
 * Random rather than derived from the vendor's id, because the address has to
 * exist before `createUser` chooses that id. It carries no meaning and is never
 * parsed — `findVendorIdentity` reads the value back from auth, it does not
 * reconstruct it.
 */
export function makeVendorAuthEmail(): string {
  return `v.${crypto.randomUUID()}@${VENDOR_AUTH_DOMAIN}`;
}

/** Is this one of our internal vendor addresses? */
export function isInternalVendorEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${VENDOR_AUTH_DOMAIN}`);
}

/**
 * Normalise a user-typed address. Every writer stores this form, and every
 * lookup expects it — `profiles.email` is compared with plain equality, not
 * `ilike`, because a valid local part may contain `_` or `%`, which LIKE would
 * treat as wildcards.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface VendorIdentity {
  /** `profiles.id`, which is also `auth.uid()` once signed in. */
  userId: string;
  /** The address to hand `signInWithPassword`. Internal for split accounts. */
  authEmail: string;
  /** False only for accounts created before migration 017 — see below. */
  split: boolean;
}

/**
 * Find the vendor account registered under a visible email address.
 *
 * Returns null when there is no vendor account for that email — which is NOT an
 * error, and is exactly the case where a customer may want to register one.
 *
 * One lookup covers both account vintages. Migration 017 backfilled
 * `profiles.email` for every pre-existing profile from its auth row, so a vendor
 * created before the split is found here too; its `authEmail` simply comes back
 * as the real address rather than a synthetic one, and its existing password
 * keeps working.
 */
export async function findVendorIdentity(
  realEmail: string
): Promise<VendorIdentity | null> {
  const normalized = normalizeEmail(realEmail);
  if (!normalized) return null;

  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "vendor")
    .eq("email", normalized)
    .maybeSingle();

  if (error) {
    console.error("findVendorIdentity — profile lookup failed:", error);
    return null;
  }
  if (!profile) return null;

  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(
    profile.id
  );
  const authEmail = authUser?.user?.email;
  if (authError || !authEmail) {
    console.error("findVendorIdentity — auth lookup failed:", authError);
    return null;
  }

  return { userId: profile.id, authEmail, split: isInternalVendorEmail(authEmail) };
}

/** Convenience for the sign-in paths, which only need the address. */
export async function resolveVendorAuthEmail(
  realEmail: string
): Promise<string | null> {
  return (await findVendorIdentity(realEmail))?.authEmail ?? null;
}

export interface CreateVendorAccountInput {
  /** The address the person typed. Becomes `profiles.email`. */
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  /** Additional profile columns (address, city, lat, …), merged after the core fields. */
  profileExtra?: Record<string, unknown>;
}

export type CreateVendorAccountResult =
  | { ok: true; userId: string; authEmail: string }
  | { ok: false; reason: "email_in_use" | "error"; message: string };

/**
 * Create a vendor account: its own auth row, profile row marked `role='vendor'`
 * with the visible address.
 *
 * A customer account on the same address is deliberately NOT a conflict — that
 * is the entire feature. Only a second *vendor* account for one address is
 * rejected, which the partial unique index in migration 017 also enforces at the
 * database level.
 *
 * Does not sign anyone in. The caller gets `authEmail` back because that is the
 * address `signInWithPassword` must be given — for a split account it is not the
 * address the user typed.
 */
export async function createVendorAccount(
  input: CreateVendorAccountInput
): Promise<CreateVendorAccountResult> {
  const realEmail = normalizeEmail(input.email);
  const admin = createAdminClient();

  if (await findVendorIdentity(realEmail)) {
    return {
      ok: false,
      reason: "email_in_use",
      message: "A vendor account already exists for this email. Please sign in instead.",
    };
  }

  const authEmail = makeVendorAuthEmail();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: authEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      role: "vendor",
      // Recorded so the address survives even if the profile update below has
      // to be replayed by hand.
      contact_email: realEmail,
    },
  });

  if (authError || !authData?.user) {
    console.error("createVendorAccount — createUser failed:", authError);
    return {
      ok: false,
      reason: "error",
      message: authError?.message ?? "Failed to create user account",
    };
  }

  const userId = authData.user.id;

  const profileUpdate: Record<string, unknown> = {
    email: realEmail,
    full_name: input.fullName,
    phone: input.phone ?? null,
    role: "vendor", // the trigger's default is 'customer' — override it
    date_of_birth: input.dateOfBirth ?? null,
    email_verified: true,
    phone_verified: false,
    terms_accepted: true,
    terms_accepted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...(input.profileExtra ?? {}),
  };

  const { error: profileError } = await admin
    .from("profiles")
    .update(profileUpdate)
    .eq("id", userId);

  if (profileError) {
    console.error("createVendorAccount — profile update failed:", profileError);
    // Roll back rather than leave a half-built account. The auth row is keyed on
    // an address no one can type, so an orphan could neither sign in nor be
    // recovered by the user — and it would block this email from registering.
    const { error: cleanupError } = await admin.auth.admin.deleteUser(userId);
    if (cleanupError) {
      console.error("createVendorAccount — rollback failed:", cleanupError);
    }
    return {
      ok: false,
      reason: "error",
      message: "Could not finalise the vendor account. Please try again.",
    };
  }

  return { ok: true, userId, authEmail };
}
