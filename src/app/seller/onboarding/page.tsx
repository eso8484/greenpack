import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Vendor registration entry point. The "Register Your Business" buttons on
 * /sell point here so the vendor path is visibly separate from the customer
 * registration flow at /register.
 *
 * Implemented as a Server Component on purpose:
 *   - It always reads the *current* session from request cookies, so it can't
 *     load the wrong user's onboarding state when multiple accounts have been
 *     used in the same browser (closes the cross-account leak in goals #3).
 *   - The decision (signup vs shop form) happens on the server, so the
 *     client never flashes a wrong UI based on stale React Context.
 *
 * Routing:
 *   - Unauthenticated → /signup?role=vendor&redirect=/seller/shop
 *   - Authenticated   → /seller/shop (POST flips role to vendor on first save)
 */
export const dynamic = "force-dynamic";

export default async function SellerOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup?role=vendor&redirect=/seller/shop");
  }

  redirect("/seller/shop");
}
