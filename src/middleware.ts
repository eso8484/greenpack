import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isCourierHost, isVendorHost } from "@/lib/hosts";

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
  "/courier/dashboard": ["courier", "admin"],
  "/admin": ["admin"],
};

// Clean URLs served by the vendor host, mapped onto the /seller/* routes that
// actually implement them. The rewrite is internal: the address bar keeps the
// clean form, so `vendor.greenpackdelight.com/products` renders the products
// page without the customer site's route prefix leaking into vendor URLs.
//
// These six keys mirror STANDALONE_EXACT in src/components/layout/AppChrome.tsx
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read `host`, which Vercel normalises. Deliberately NOT `x-forwarded-host`:
  // clients can append to that header, which would let a request to the main
  // site claim to be the vendor host.
  const host = request.headers.get("host");
  const onVendorHost = isVendorHost(host);
  const onCourierHost = isCourierHost(host);

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
  const isGuestOnlyPath = AUTH_ONLY_GUEST.some((route) => effectivePathname === route || effectivePathname.startsWith(`${route}/`));
  const isClosedHostLoginPage =
    (onVendorHost || onCourierHost) && effectivePathname === "/login";
  if (isGuestOnlyPath && user && !isClosedHostLoginPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    // On a closed host the dashboard lives at its clean URL, so send people there
    // rather than exposing the /seller or /courier prefix in the address bar.
    if (profile?.role === "vendor") url.pathname = onVendorHost ? "/dashboard" : "/seller/dashboard";
    else if (profile?.role === "courier") url.pathname = onCourierHost ? "/dashboard" : "/courier/dashboard";
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
