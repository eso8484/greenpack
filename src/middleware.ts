import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication (any role)
const AUTH_REQUIRED = ["/profile", "/checkout"];

// Routes that should redirect away when user is already signed in
const AUTH_ONLY_GUEST = ["/login", "/register", "/signup"];

// Routes that require specific roles
const ROLE_REQUIRED: Record<string, string[]> = {
  "/vendor/dashboard": ["vendor", "admin"],
  "/seller": ["vendor", "admin"],
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
    return NextResponse.redirect(url);
  }

  // Check auth-required routes
  const needsAuth = AUTH_REQUIRED.some((route) => pathname.startsWith(route));
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
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
        return NextResponse.rewrite(url, { status: 404 });
      }

      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
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
        return NextResponse.rewrite(url, { status: 404 });
      }

      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
