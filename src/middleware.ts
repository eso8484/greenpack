import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { adminUrl, isAdminHost, isCourierHost, isVendorHost, siteUrl } from "@/lib/hosts";

// Routes that require authentication (any role).
// `/vendor/register` is public — both guests and signed-in users land on the
// unified registration form (it lives outside /seller so it doesn't inherit
// the seller-dashboard sidebar layout). `/seller/shop` still requires auth
// because it edits an existing shop tied to the logged-in vendor.
// The shop POST endpoint flips the user's role to vendor on success.
const AUTH_REQUIRED = ["/profile", "/checkout", "/seller/shop"];

// Routes that should redirect away when user is already signed in
const AUTH_ONLY_GUEST = ["/login", "/register", "/signup"];

// Routes that require specific roles. Use specific subpaths instead of `/seller`
// so vendor onboarding (above) isn't blocked for customers.
const ROLE_REQUIRED: Record<string, string[]> = {
  "/vendor/dashboard": ["vendor", "admin"],
  "/seller/dashboard": ["vendor", "admin"],
  "/seller/products": ["vendor", "admin"],
  "/seller/services": ["vendor", "admin"],
  "/seller/payout": ["vendor", "admin"],
  "/seller/elite": ["vendor", "admin"],
  "/courier/dashboard": ["courier", "admin"],
  "/admin": ["admin"],
};

// Clean URLs served by the vendor host, mapped onto the /seller/* routes that
// actually implement them. The rewrite is internal: the address bar keeps the
// clean form, so `vendor.greenpackdelight.com/products` renders the products
// page without the customer site's route prefix leaking into vendor URLs.
//
// These seven keys mirror STANDALONE_EXACT in src/components/layout/AppChrome.tsx
// — keep the two lists in step. That list is what suppresses the customer
// Header/Footer, and because it contains BOTH the clean path and (via the
// `/seller` prefix) the underlying route, it holds whether usePathname()
// reports the browser URL or the rewritten one.
//
// `/seller/*` still resolves directly on the vendor host too, which is what
// keeps every existing internal link working with no component changes.
//
// `/` is deliberately absent: it is redirected rather than rewritten (below).
const VENDOR_REWRITES = new Map<string, string>([
  ["/dashboard", "/seller/dashboard"],
  ["/shop", "/seller/shop"],
  ["/services", "/seller/services"],
  ["/products", "/seller/products"],
  ["/payout", "/seller/payout"],
  ["/elite", "/seller/elite"],
  ["/onboarding", "/seller/onboarding"],
]);

// What the vendor host is permitted to serve. Everything else belongs to the
// storefront, and requesting it *here* is a dead end: chrome is suppressed on
// this host (see AppChrome), so a customer page would render with no header, no
// navigation and no route back. Such requests go to the dashboard instead, which
// bounces a signed-out visitor on to the vendor login.
//
// The clean rewrite targets are matched EXACTLY, not as prefixes: `/shop/xyz`
// is not the vendor's shop editor, it is the storefront's shop detail page, and
// letting it through would render exactly the dead end this list exists to
// prevent.
const VENDOR_HOST_ALLOWED_EXACT = [...VENDOR_REWRITES.keys()];

// …and these, together with everything beneath them.
const VENDOR_HOST_ALLOWED_PREFIXES = [
  "/seller", // the routes the clean URLs rewrite onto, still reachable directly
  "/sell", // the vendor pitch page — the landing "Become a Vendor" opens
  "/vendor/register",
  "/login",
  "/reset-password",
  "/api",
  "/not-found",
  "/_next", // HMR + data requests; redirecting these breaks the dev server
];

function isVendorHostPathAllowed(pathname: string): boolean {
  if (VENDOR_HOST_ALLOWED_EXACT.includes(pathname)) return true;

  if (
    VENDOR_HOST_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return true;
  }

  // A file request (robots.txt, manifest.webmanifest, …) rather than a page.
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  return lastSegment.includes(".");
}

// Clean URLs served by the courier hub, mapped onto the routes that implement
// them. The same internal-rewrite trick as the vendor host above: the address bar
// keeps the clean form, so the customer site's route prefix never leaks into
// courier URLs.
//
// `/` rewrites to the courier pitch rather than redirecting, which is a
// deliberate departure from the vendor host. There, serving the dashboard at `/`
// would make it indistinguishable from the customer homepage; a marketing landing
// page at `/` has no such ambiguity, and a rewrite keeps the hub's front door at a
// clean `/`.
//
// `/courier/register` is deliberately absent — the application form keeps its own
// path on both hosts, the same choice the vendor centre made for
// `/vendor/register`, so it needs no clean alias.
const COURIER_REWRITES = new Map<string, string>([
  ["/", "/become-courier"],
  ["/dashboard", "/courier/dashboard"],
]);

// What the courier hub is permitted to serve, for the same reason as the vendor
// allow-list above: chrome is suppressed on this host, so a storefront page served
// here would render with no header, no navigation, and no route back.
//
// `/terms` and `/privacy` are deliberately NOT listed. The application form links
// them at `siteUrl(...)` instead, so they open the customer site's versions in a
// new tab; serving them here would only mean rendering them without the chrome
// that makes them navigable.
const COURIER_HOST_ALLOWED_EXACT = [
  ...COURIER_REWRITES.keys(), // "/" and "/dashboard"
  "/become-courier", // the pitch, still reachable at its own path
];

const COURIER_HOST_ALLOWED_PREFIXES = [
  "/courier", // the application form, and the dashboard's real route
  "/login",
  "/reset-password",
  "/api",
  "/not-found",
  "/_next", // HMR + data requests; redirecting these breaks the dev server
];

function isCourierHostPathAllowed(pathname: string): boolean {
  if (COURIER_HOST_ALLOWED_EXACT.includes(pathname)) return true;

  if (
    COURIER_HOST_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return true;
  }

  // A file request (robots.txt, manifest.webmanifest, …) rather than a page.
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  return lastSegment.includes(".");
}

// The admin console's allow-list. The structural difference from the two hosts
// above is that there is nothing to rewrite: `/admin/*` keeps its own path on
// this host, so there is no ADMIN_REWRITES map and no EXACT list — every allowed
// path is a prefix.
//
// `/` is deliberately ABSENT. The console has no front door: a request for the
// host's root falls through to the closed-host block below and lands on `/admin`,
// which 404s for anyone who is not signed in as an admin. That is the intended
// greeting for a stranger who has found the hostname in a Certificate
// Transparency log.
const ADMIN_HOST_ALLOWED_PREFIXES = [
  "/admin", // all four console pages, matched by ROLE_REQUIRED["/admin"]
  "/login", // the customer lane — an admin signs in here like anyone else
  "/reset-password",
  "/api", // the console's own API routes; they self-check requireAdmin()
  "/not-found", // the rewrite target for every 404 on this host
  "/_next", // HMR + data requests; redirecting these breaks the dev server
];

function isAdminHostPathAllowed(pathname: string): boolean {
  if (
    ADMIN_HOST_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return true;
  }

  // A file request (robots.txt, manifest.webmanifest, …) rather than a page.
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  return lastSegment.includes(".");
}

// ── The gate ─────────────────────────────────────────────────────────────────
//
// A device door, not an IP door. It exists because the requirement behind it was
// "sometimes my IP or home network can change, which prevents my IP from reaching
// the panel" — and an IP allow-list is precisely the thing that breaks when a
// network changes. Nothing here consults an address.
//
// Two independent proofs guard the console, and neither subsumes the other:
//
//   Door A  the gate cookie  — this browser was granted access, long ago
//   Door B  the Supabase session + ROLE_REQUIRED["/admin"] — this session is an admin
//
// Door B is the existing hideIfUnauthorized behaviour and is untouched. Door A is
// the cookie set by visiting /gate/<secret> once per device. Clearing the cookie
// locks an admin out; revoking the session is a separate act. Both must hold.
//
// An unset ADMIN_GATE_SECRET locks the console rather than opening it — the
// opposite of rateLimit() in src/lib/rate-limit.ts, which deliberately fails
// OPEN. The two must not be assumed to agree.
const ADMIN_GATE_COOKIE = "gp_admin_gate";
const ADMIN_GATE_PATH = "/gate";

// Exemptions are mechanical, not policy: Next's own asset/HMR requests must pass
// or dev breaks, and a file request is not a page.
function adminGateExempt(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  return last.includes(".");
}

// Constant-time compare. A plain `===` leaks the secret one byte at a time to
// anyone willing to measure the response — and this comparison is reachable by
// the public, on a URL whose whole job is to be unguessable.
function gateSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// The cookie's value is an HMAC of a FIXED string keyed on the secret — never the
// secret itself. A leaked cookie therefore grants access without disclosing the
// URL that mints it, and rotating the secret invalidates every enrolled device at
// once. The version suffix is what makes a future change of scheme a rotation
// rather than a silent reinterpretation of existing cookies.
async function adminGateValue(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("gp-admin-gate-v1")
  );
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read `host`, which Vercel normalises. Deliberately NOT `x-forwarded-host`:
  // clients can append to that header, which would let a request to the main
  // site claim to be the vendor host.
  const host = request.headers.get("host");
  const onVendorHost = isVendorHost(host);
  const onCourierHost = isCourierHost(host);
  const onAdminHost = isAdminHost(host);

  // Resolve the host's clean URLs onto the real routes BEFORE any auth matching
  // runs. Matching against the incoming path instead would let `/dashboard` slip
  // past ROLE_REQUIRED["/seller/dashboard"] (or "/courier/dashboard") and hand an
  // unauthenticated visitor the dashboard shell instead of a login redirect.
  //
  // Vendor is tested first. The two hostnames can never both match (different
  // first labels), but ordering it this way means a misconfigured
  // NEXT_PUBLIC_COURIER_URL pointing at the vendor host degrades to vendor
  // behaviour rather than to a host running both rule sets.
  const rewriteTo = onVendorHost
    ? VENDOR_REWRITES.get(pathname)
    : onCourierHost
      ? COURIER_REWRITES.get(pathname)
      : undefined;
  const effectivePathname = rewriteTo ?? pathname;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // getUser() may have refreshed the access token, in which case setAll wrote
  // NEW auth cookies onto `supabaseResponse`. Any response we return instead of
  // that object (every redirect/rewrite below) MUST carry those cookies over,
  // or the browser keeps the old (now-rotated) token and the very next request
  // looks logged-out — the intermittent "bounced to /login while signed in"
  // bug. This helper copies the refreshed cookies onto a redirect/rewrite.
  const withAuthCookies = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    return response;
  };

  // The vendor host has no landing page of its own. Serving one via rewrite would
  // make the vendor dashboard reachable at a path indistinguishable from the
  // customer homepage, which in turn would force the shared chrome component to
  // know which host it is on. Redirecting to the explicit clean path keeps every
  // vendor-host URL unambiguous instead.
  //
  // The courier hub has no equivalent block because it *does* have a landing page
  // — the pitch — so its `/` is rewritten rather than redirected. See
  // COURIER_REWRITES above.
  if (onVendorHost && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withAuthCookies(NextResponse.redirect(url));
  }

  // Close the vendor host. Anything the storefront owns — /browse, /cart,
  // /wishlist, the customer /register and /signup — is not served here. Placed
  // after the `/` redirect so the homepage keeps its own explicit destination,
  // and before the auth checks so a blocked path never reaches them.
  if (onVendorHost && !isVendorHostPathAllowed(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withAuthCookies(NextResponse.redirect(url));
  }

  // Close the courier hub the same way. `/dashboard` is the destination here too:
  // it is the one page on this host that produces a useful next step for whoever
  // arrives — a login form for a guest, the dashboard for a courier.
  //
  // Note this runs on the *incoming* pathname, not the rewritten one, so `/` on
  // this host is judged as `/` (allowed, then rewritten to the pitch below) and is
  // not swept up here.
  if (onCourierHost && !isCourierHostPathAllowed(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withAuthCookies(NextResponse.redirect(url));
  }

  // ── The admin host ─────────────────────────────────────────────────────────
  //
  // The gate runs FIRST, ahead of the closed-host block below, so an ungated
  // visitor learns nothing about the host's shape — not even which paths redirect
  // where. Everything it refuses is answered with the same 404 rewrite
  // hideIfUnauthorized already uses, so "not allowed in" and "no such route" are
  // indistinguishable from outside.
  if (onAdminHost) {
    const secret = process.env.ADMIN_GATE_SECRET;

    // Enrolment. A correct secret mints the cookie; anything else — a wrong
    // secret, an empty one, a bare /gate — gets the ordinary 404. A distinct
    // error here would confirm the path exists and turn the secret into something
    // guessable by oracle, which is exactly what a shared secret must not be.
    if (pathname === ADMIN_GATE_PATH || pathname.startsWith(`${ADMIN_GATE_PATH}/`)) {
      const provided = pathname.slice(ADMIN_GATE_PATH.length + 1);
      if (secret && provided && gateSafeEqual(provided, secret)) {
        const url = request.nextUrl.clone();
        // Land on /login?redirect=/admin, not on /admin. A freshly enrolled
        // browser is usually signed out on this host, and /admin without an
        // admin session is a deliberate 404 (hideIfUnauthorized) — so going
        // straight there greets a *successful* enrolment with "page not found",
        // which reads as the gate having failed. /login is right either way:
        // signed out it renders the form, and a signed-in admin is forwarded on
        // by the guest-only bounce, which this host deliberately does not exempt.
        // This is the same URL the customer-host hand-off uses.
        url.pathname = "/login";
        url.search = "?redirect=/admin";
        const res = withAuthCookies(NextResponse.redirect(url));
        // Set AFTER withAuthCookies() so the two never contend for the response.
        res.cookies.set(ADMIN_GATE_COOKIE, await adminGateValue(secret), {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 400, // the browser ceiling; the cookie is the door key
        });
        return res;
      }

      const url = request.nextUrl.clone();
      url.pathname = "/not-found";
      return withAuthCookies(NextResponse.rewrite(url, { status: 404 }));
    }

    // The gate itself. An unset secret yields expected === "", which no cookie
    // can equal, so the host serves 404s and nothing else — including /login.
    // Fail CLOSED: a missing env var must never be the thing that opens the door.
    if (!adminGateExempt(pathname)) {
      const expected = secret ? await adminGateValue(secret) : "";
      const presented = request.cookies.get(ADMIN_GATE_COOKIE)?.value ?? "";
      if (!expected || !gateSafeEqual(presented, expected)) {
        const url = request.nextUrl.clone();
        url.pathname = "/not-found";
        return withAuthCookies(NextResponse.rewrite(url, { status: 404 }));
      }
    }
  }

  // Close the admin host. There is no `/dashboard` equivalent to send people to —
  // `/admin` is the one destination that produces a useful next step, and for a
  // signed-out visitor it 404s by way of hideIfUnauthorized, which is the point.
  //
  // This runs on the *incoming* pathname, so `/` on this host is judged as `/`
  // (not allowed, no rewrite target) and is swept up here exactly like `/browse`.
  if (onAdminHost && !isAdminHostPathAllowed(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return withAuthCookies(NextResponse.redirect(url));
  }

  // The console used to live at greenpackdelight.com/admin. It does not any more,
  // and the old path hands over rather than 404s.
  //
  // It routes through the admin host's own /login rather than straight to the
  // path, because session cookies are host-only: someone signed in on the
  // customer host is a *guest* on the admin host, so a direct jump would show him
  // a 404 at the exact moment he asked for his console. Through /login it is
  // correct either way — already signed in there, /login forwards straight on;
  // not signed in, he signs in once.
  //
  // The three-host guard is explicit. Without it this would fire on a closed host
  // too and fight the blocks above for the same request.
  if (
    !onVendorHost &&
    !onCourierHost &&
    !onAdminHost &&
    pathname.startsWith("/admin")
  ) {
    const url = new URL(adminUrl(`/login?redirect=${pathname}`));
    return withAuthCookies(NextResponse.redirect(url));
  }

  // Redirect signed-in users away from guest-only auth pages.
  //
  // The closed hosts' `/login` is the one exception. That page is the front door
  // of a closed surface — every other route there redirects to `/dashboard` — so
  // bouncing a signed-in visitor off it leaves signing out as the only way to
  // reach it at all. In practice that makes an explicitly-labelled "Log in to
  // your dashboard" link on `/sell` (or `/become-courier`) silently enter
  // whichever account the cookie already holds, which reads as the site signing
  // you in by itself. Letting the form render is the honest outcome; the visitor
  // can still sign in as someone else, and `/dashboard` is one link away.
  //
  // The customer host keeps the conventional behaviour: a signed-in shopper is
  // sent on to the store rather than shown a login form.
  //
  // The admin host is deliberately NOT added to isClosedHostLoginPage. For the
  // vendor centre and the courier hub, /login *is* the front door and bouncing off
  // it would leave signing out as the only way back. The console's front door is
  // /admin, so /login can stay conventional — and that is load-bearing: it is what
  // lets the hand-off above auto-forward an admin who is already signed in on the
  // admin host. Adding the exemption later would silently reintroduce the "sign in
  // again" step, which is the bug the hand-off exists to remove.
  const isGuestOnlyPath = AUTH_ONLY_GUEST.some((route) => effectivePathname === route || effectivePathname.startsWith(`${route}/`));
  const isClosedHostLoginPage =
    (onVendorHost || onCourierHost) && effectivePathname === "/login";
  if (isGuestOnlyPath && user && !isClosedHostLoginPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // The admin host is the only closed host /login is not exempted on, so it is
    // the only one where this bounce can fire somewhere other than the customer
    // site — and two of its outcomes leave the host entirely. A signed-in
    // non-admin belongs on the storefront, and an admin whose session lives on the
    // customer host is a guest on the admin host, so he needs the host's own
    // sign-in door. Both return an absolute URL rather than a cloned same-host
    // path, for the same reason rule 6 exists for vendors and couriers.
    if (onAdminHost && profile?.role !== "admin") {
      return withAuthCookies(NextResponse.redirect(new URL(siteUrl("/browse"))));
    }
    if (!onAdminHost && profile?.role === "admin") {
      return withAuthCookies(
        NextResponse.redirect(new URL(adminUrl("/login?redirect=/admin")))
      );
    }

    const url = request.nextUrl.clone();
    // On a closed host the dashboard lives at its clean URL, so send people there
    // rather than exposing the /seller or /courier prefix in the address bar.
    if (profile?.role === "vendor") url.pathname = onVendorHost ? "/dashboard" : "/seller/dashboard";
    else if (profile?.role === "courier") url.pathname = onCourierHost ? "/dashboard" : "/courier/dashboard";
    // Reachable now only on the admin host: the two early returns above take an
    // admin off every other host and take everyone else off this one.
    else if (profile?.role === "admin") url.pathname = "/admin";
    else url.pathname = "/browse";
    url.search = "";
    return withAuthCookies(NextResponse.redirect(url));
  }

  // Check auth-required routes
  const needsAuth = AUTH_REQUIRED.some((route) => effectivePathname.startsWith(route));
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Store the path the browser will actually re-request, not the rewritten
    // one, so a vendor-host visitor returns to its own clean URL.
    url.searchParams.set("redirect", pathname);
    // The login page already understands `mode=vendor`: it switches to the
    // vendor lane and offers vendor signup instead of customer registration.
    if (onVendorHost) url.searchParams.set("mode", "vendor");
    return withAuthCookies(NextResponse.redirect(url));
  }

  // Check role-required routes
  const matchedRoleRoute = Object.entries(ROLE_REQUIRED).find(([route]) =>
    effectivePathname.startsWith(route)
  );

  if (matchedRoleRoute) {
    const roleRoute = matchedRoleRoute[0];
    const hideIfUnauthorized = roleRoute.startsWith("/admin");

    if (!user) {
      if (hideIfUnauthorized) {
        const url = request.nextUrl.clone();
        url.pathname = "/not-found";
        return withAuthCookies(NextResponse.rewrite(url, { status: 404 }));
      }

      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      if (onVendorHost) url.searchParams.set("mode", "vendor");
      return withAuthCookies(NextResponse.redirect(url));
    }

    // Fetch role from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const allowedRoles = matchedRoleRoute[1];
    if (!profile || !allowedRoles.includes(profile.role)) {
      if (hideIfUnauthorized) {
        const url = request.nextUrl.clone();
        url.pathname = "/not-found";
        return withAuthCookies(NextResponse.rewrite(url, { status: 404 }));
      }

      // A signed-in user without the right role shouldn't silently land on a
      // dashboard that isn't theirs. Send seller-area visitors to vendor
      // registration (become a vendor) rather than the generic homepage, so
      // the path to *their own* seller account is obvious.
      if (roleRoute.startsWith("/seller")) {
        return withAuthCookies(NextResponse.redirect(new URL("/vendor/register", request.url)));
      }

      return withAuthCookies(NextResponse.redirect(new URL("/", request.url)));
    }
  }

  // On the vendor host, signing in means vendor sign-in. The login page already
  // has a vendor lane (it reads ?mode=vendor) but only knows to use it when the
  // URL says so — a vendor who types the address directly would otherwise get
  // the customer sign-in.
  //
  // This has to be a REDIRECT, not a rewrite. The login page is a Client
  // Component that reads the lane through useSearchParams(), which reflects the
  // *browser* URL. A rewrite injects the param into the server render only, so
  // the client hydrates against the bare /login and falls straight back to the
  // customer lane — the vendor copy briefly served by the server is thrown
  // away. A redirect puts `mode=vendor` in the address bar, where both the
  // server and the client read it. Only the query changes (the path stays
  // /login), so this adds no ambiguity for the chrome component the way a
  // clean-URL rewrite would.
  //
  // Deliberately after the guest-only check: an already signed-in visitor is
  // redirected away above and should not see a login page at all.
  //
  // There is no courier equivalent of this block, and that is the design rather
  // than an omission. Couriers have no split identity — their courier account is
  // their customer account, with `profiles.role` flipped to `courier` when an
  // admin approves the application — so the hub's `/login` is the ordinary
  // customer lane, already correct as-is.
  if (
    onVendorHost &&
    effectivePathname === "/login" &&
    request.nextUrl.searchParams.get("mode") !== "vendor"
  ) {
    const url = request.nextUrl.clone();
    url.searchParams.set("mode", "vendor");
    return withAuthCookies(NextResponse.redirect(url));
  }

  // Rewrite (not redirect) so the host's clean URL stays in the address bar while
  // the route underneath does the rendering.
  if (rewriteTo) {
    const url = request.nextUrl.clone();
    url.pathname = rewriteTo;
    return withAuthCookies(NextResponse.rewrite(url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
