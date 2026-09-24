import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCourierHost, isVendorHost, vendorUrl, VENDOR_ORIGIN } from "@/lib/hosts";
import { findVendorIdentity } from "@/lib/vendor-identity";

/**
 * OAuth / magic-link callback for both lanes.
 *
 * The storefront and the vendor centre share an email address but not an
 * account: a vendor has its own auth row filed under an internal address (see
 * src/lib/vendor-identity.ts). Google can only ever hand us one identity for
 * `user@example.com` — it cannot say "this is the vendor John" — so on the
 * vendor lane we use Google as *proof of the address* and then mint a session
 * for the vendor account registered under it. Without that step, signing in
 * with Google on the vendor lane would land the vendor in their customer
 * account, which is the bug this route exists to fix.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Which lane is signing in? Defaults to the customer lane, so every caller
  // that predates the split behaves exactly as before.
  const loginMode: "customer" | "vendor" =
    searchParams.get("mode") === "vendor" ? "vendor" : "customer";
  // Two different questions, deliberately kept apart:
  //   onVendorHost  — which host did this request actually arrive on?
  //   useVendorHost — does the caller want the vendor lane?
  // They differ when a vendor-lane callback arrives on the customer host, which
  // is exactly the case that used to mint the session into the wrong cookie jar.
  const onVendorHost = isVendorHost(request.headers.get("host"));
  const onCourierHost = isCourierHost(request.headers.get("host"));
  const useVendorHost = loginMode === "vendor" || onVendorHost;

  // Both closed hosts land on their dashboard by default. Falling back to `/`
  // would be wrong on each for its own reason: on the vendor host `/` only
  // redirects to `/dashboard` anyway, and on the courier host `/` is the
  // marketing pitch — a signed-in courier dropped on the "become a courier" ad.
  //
  // Unlike the vendor lane, there is no courier-lane backstop below and none is
  // wanted: `origin` is wherever the browser landed, and since a courier
  // sign-in can only ever be *started* on the hub (there is no `mode=courier`
  // to carry across hosts), that origin is already the host that owns the
  // session. Only the vendor lane can be started on the wrong host.
  const fallbackNext = useVendorHost || onCourierHost ? "/dashboard" : "/";
  const safeNext = next && next.startsWith("/") ? next : fallbackNext;
  // The vendor lane finishes on the vendor host, whatever host the callback was
  // served from. `origin` is wherever the browser happened to land, and for a
  // vendor that is not necessarily the host that owns the session — because
  // Supabase cookies are host-only, arriving on the wrong host means arriving
  // signed out. VENDOR_ORIGIN is the configured centre (NEXT_PUBLIC_VENDOR_URL
  // locally, the real subdomain in production).
  const redirectUrl = new URL(safeNext, useVendorHost ? VENDOR_ORIGIN : origin);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data?.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  if (loginMode !== "vendor") {
    // Customer lane, unchanged. Google signing in an address that has no
    // customer account creates one — that is OAuth's normal sign-up-on-first-
    // sign-in behaviour and predates this change. Note that a vendor-only email
    // does not block it: the vendor account lives on its own row, so this
    // address is genuinely free on the customer side.
    return response;
  }

  // ─── Vendor lane ──────────────────────────────────────────────────────────

  // A vendor-lane callback that arrived on the customer host has already
  // exchanged the code into the *customer* cookie jar. Left alone it would
  // redirect to the vendor host carrying cookies that host cannot see — an
  // instant signed-out bounce — while stranding a customer session nobody asked
  // for. Drop it and restart on the host that owns the vendor lane. The login
  // page now refuses to begin this round-trip off the vendor host, so this is a
  // backstop for a stale link or a hand-built URL, not the normal path.
  if (!onVendorHost) {
    await supabase.auth.signOut({ scope: "local" });
    const loginUrl = new URL(vendorUrl("/login"));
    loginUrl.searchParams.set("mode", "vendor");
    return withSessionCookies(response, loginUrl);
  }

  const googleEmail = data.user.email;
  const identity = googleEmail ? await findVendorIdentity(googleEmail) : null;

  if (!identity) {
    // Google proved the address, but no vendor account is registered under it.
    // Hand them the vendor registration form rather than letting the customer
    // session they just acquired stand — on the vendor host that session would
    // render a dashboard they cannot use. The exchanged row is harmless if it
    // stays: it is an ordinary customer account they may use later, and it does
    // not block vendor registration (the two are separate rows by design).
    await supabase.auth.signOut({ scope: "local" });
    const registerUrl = new URL(vendorUrl("/vendor/register"));
    registerUrl.searchParams.set("notice", "no_vendor_account");
    if (googleEmail) registerUrl.searchParams.set("email", googleEmail);
    return withSessionCookies(response, registerUrl);
  }

  // A vendor registered before the split still lives on its real-email auth row,
  // so the session we just exchanged is already the right one. Re-minting would
  // be a pointless round-trip.
  if (identity.authEmail === googleEmail?.toLowerCase()) {
    return response;
  }

  // The Google session is the *customer* row. Drop it before minting the
  // vendor one: both would otherwise write session cookies to this response,
  // and the order below (sign out, then verify) is what makes the vendor
  // session win. `scope: "local"` — never "global", which would revoke the
  // refresh token server-side for the whole user and sign them out of the
  // customer host too.
  await supabase.auth.signOut({ scope: "local" });

  const admin = createAdminClient();
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: identity.authEmail,
  });

  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error("vendor callback generateLink:", linkError?.message);
    // Carry `response`'s cookies: the sign-out above cleared them, and dropping
    // them here would leave the browser holding the customer session we just
    // discarded — middleware would then bounce them off /login straight back
    // into the customer account, with no error ever shown.
    return withSessionCookies(
      response,
      new URL(`${origin}/login?error=auth_callback_failed`)
    );
  }

  // verifyOtp writes the vendor's session cookies through the same setAll
  // adapter, replacing the ones signOut just cleared.
  const { data: vendorSession, error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

  if (verifyError || !vendorSession.user) {
    console.error("vendor callback verifyOtp:", verifyError?.message);
    return withSessionCookies(
      response,
      new URL(`${origin}/login?error=auth_callback_failed`)
    );
  }

  return response;
}

/**
 * Copy the session cookies off `from` onto a fresh redirect. Needed whenever we
 * redirect after touching the session — otherwise the browser keeps whatever
 * cookies it already had and the sign-out never takes effect.
 */
function withSessionCookies(from: NextResponse, to: URL): NextResponse {
  const next = NextResponse.redirect(to);
  from.cookies.getAll().forEach((cookie) => {
    next.cookies.set(cookie);
  });
  return next;
}
