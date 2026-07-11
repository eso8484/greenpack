import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Redirect signed-in users away from guest-only auth pages
  const isGuestOnlyPath = AUTH_ONLY_GUEST.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isGuestOnlyPath && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    if (profile?.role === "vendor") url.pathname = "/seller/dashboard";
    else if (profile?.role === "courier") url.pathname = "/courier/dashboard";
    else if (profile?.role === "admin") url.pathname = "/admin";
    else url.pathname = "/browse";
    url.search = "";
    return withAuthCookies(NextResponse.redirect(url));
  }

  // Check auth-required routes
  const needsAuth = AUTH_REQUIRED.some((route) => pathname.startsWith(route));
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return withAuthCookies(NextResponse.redirect(url));
  }

  // Check role-required routes
  const matchedRoleRoute = Object.entries(ROLE_REQUIRED).find(([route]) =>
    pathname.startsWith(route)
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

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
