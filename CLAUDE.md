codex# GreenPack

## Overview
GreenPack (brand: **Green Pack Delight**) is a Nigerian service and shop discovery platform. Vendors list businesses with video showcases, products, and services (laundry, barbershop, phone repair, fashion, food, etc.). Customers browse, discover, and connect with providers via phone, WhatsApp, or inquiry form. Couriers handle deliveries end-to-end.

**Backend**: Supabase (PostgreSQL + Auth + RLS). Falls back to mock TypeScript data when `NEXT_PUBLIC_SUPABASE_URL` is not configured.

## Tech Stack
- **Next.js 16.1.6** — App Router, TypeScript, Turbopack
- **React 19**
- **Tailwind CSS v3** — class-based dark mode (`darkMode: "class"`)
- **Framer Motion** — animations (`whileHover`, `whileTap`, `AnimatePresence`)
- **Sonner** — toast notifications
- **next-themes** — dark mode toggle (ThemeProvider wraps app)
- **Supabase** — Auth, PostgreSQL DB, Row Level Security (RLS), SSR client via `@supabase/ssr`
- **Termii** — Nigerian SMS API for courier/delivery notifications
- **Currency**: Nigerian Naira (NGN), symbol: `₦`

## Commands
```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
```

## Project Structure
```
src/
├── app/
│   ├── layout.tsx                  # Root: ThemeProvider > CartProvider > Header + Footer + Toaster
│   ├── page.tsx                    # Homepage
│   ├── globals.css                 # Tailwind + dark mode body/scrollbar
│   ├── loading.tsx                 # Global loading state
│   ├── not-found.tsx               # 404 page
│   ├── browse/page.tsx             # Browse/listings
│   ├── shop/[shopId]/page.tsx      # Shop detail (generateStaticParams)
│   ├── cart/page.tsx               # Cart
│   ├── checkout/page.tsx           # Checkout
│   ├── help/page.tsx               # Help Center with FAQs
│   ├── contact-support/page.tsx    # Floating support widget + assistant/live-agent handoff
│   ├── search/page.tsx             # Search results
│   ├── wishlist/page.tsx           # Saved/wishlisted shops
│   ├── profile/page.tsx            # Customer profile (auth required)
│   ├── login/page.tsx              # Login
│   ├── register/page.tsx           # Register (customer)
│   ├── signup/page.tsx             # Customer signup (?role=vendor redirects to vendor host)
│   ├── sell/page.tsx               # Become a vendor landing
│   ├── become-courier/page.tsx     # Become a courier landing
│   ├── vendor/dashboard/page.tsx   # Vendor dashboard (role: vendor/admin)
│   ├── seller/                     # Seller management pages
│   ├── courier/
│   │   ├── layout.tsx              # Courier layout — Server Component (keeps `metadata`), renders CourierShell
│   │   ├── register/page.tsx       # Courier application form — same path on all hosts
│   │   └── dashboard/page.tsx      # Courier dashboard (role: courier/admin) — served at /dashboard on the hub
│   ├── terms/page.tsx              # Terms of service
│   ├── privacy/page.tsx            # Privacy policy
│   └── api/
│       ├── auth/callback/          # Supabase auth callback (OAuth/magic link)
│       ├── couriers/apply/         # POST — courier application
│       ├── deliveries/             # GET all | POST create delivery
│       │   ├── available/          # GET available jobs for couriers
│       │   └── [id]/               # GET/PATCH specific delivery
│       ├── orders/                 # GET all | POST create order
│       │   └── [orderId]/          # GET/PATCH specific order
│       ├── products/               # Products CRUD
│       ├── profile/                # GET/PATCH current user profile
│       ├── reviews/                # Reviews CRUD
│       ├── shops/                  # Shops CRUD
│       ├── support/
│       │   ├── tickets/            # Customer support tickets + chat messages API
│       │   └── agent/
│       │       ├── events/         # Agent webhook-style events (assign/reply/resolve/reopen)
│       │       └── tickets/        # Admin agent console APIs (list/manage tickets/messages)
│       └── verify/                 # OTP verification endpoint
├── components/
│   ├── ui/           # Button, Card, Badge, Rating, PriceTag, Input, EmptyState, Skeleton, Toaster
│   ├── layout/       # Header, Footer, MobileNav, SearchBar, ThemeToggle, AppChrome
│   ├── courier/      # CourierShell — the courier hub's own top bar (no sidebar; it is one page)
│   ├── providers/    # ThemeProvider (next-themes wrapper)
│   ├── auth/         # OTPInput, PasswordStrength
│   ├── home/         # HeroSection, CategoryNav, FeaturedShops, HowItWorks
│   ├── browse/       # CategorySidebar, ShopCard, ShopGrid, FilterBar
│   ├── shop/         # ShopHeader, VideoShowcase, ServiceList, ServiceCard,
│   │                 # ProductGrid, ProductCard, ShopContactInfo, ReviewSection, ReviewCard
│   ├── cart/         # CartItem, CartItemList, CartSummary
│   ├── checkout/     # ContactForm, OrderReview, CheckoutSummary
│   └── help/         # FAQAccordion, CategoryCard
├── lib/
│   ├── data/         # shops.ts, categories.ts, services.ts, products.ts, reviews.ts, faqs.ts (mock fallback)
│   ├── db.ts         # DB access layer — Supabase queries with mock fallback + snake_case→camelCase mappers
│   ├── supabase/
│   │   ├── client.ts # Browser Supabase client (createBrowserClient)
│   │   ├── server.ts # Server Supabase client (createServerClient with cookies)
│   │   └── admin.ts  # Admin client (service_role key — server-only)
│   ├── termii.ts     # Termii SMS helpers (sendSMS, notifyCourier*, notifyVendor*, notifyCustomer*)
│   ├── vendor-identity.ts # Split vendor/customer accounts — the only home for the synthetic-address rule
│   ├── hosts.ts      # Multi-host helpers — isVendorHost(), isCourierHost(), vendorUrl(), courierUrl(), siteUrl()
│   ├── utils.ts      # formatPrice, filterShops, cn(), BLUR_PLACEHOLDER, etc.
│   └── constants.ts  # SITE_NAME, CURRENCY, CURRENCY_SYMBOL
├── hooks/            # useCart.ts, useSearch.ts
├── context/          # CartContext.tsx (useReducer: ADD, REMOVE, UPDATE, CLEAR)
├── middleware.ts     # Auth + role-based route protection + the closed vendor and courier hosts
└── types/            # index.ts (Shop, Service, Product, Review, CartItem, etc.)

supabase/
└── migrations/
    ├── 001_initial_schema.sql                       # profiles, shops, services, products, orders, reviews, deliveries
    └── 002_verification_and_profile_update.sql      # verification_otps, profile fields (DOB, email/phone_verified, terms)
  └── 003_support_tickets.sql                      # support_tickets, support_messages, RLS policies
  └── … up to 016
  └── 017_vendor_accounts.sql                      # profiles.email, vendor-only unique index, handle_new_user() email
```

`src/lib/vendor-identity.ts` — the one home for the split vendor/customer identity rule (see
**Vendor Accounts**).

## Routes

| Route | Type | Auth | Description |
|-------|------|------|-------------|
| `/` | Server | — | Homepage — hero, categories, featured shops, how it works |
| `/browse` | Server | — | Browse shops — supports `?category=X&q=Y&sort=Z&verified=true` |
| `/shop/[shopId]` | Server | — | Shop detail — video, services, products, reviews, contact info |
| `/search` | Server | — | Search results page |
| `/cart` | Client | — | Cart management — grouped by shop, quantity controls |
| `/checkout` | Client | — | Contact form + order review, success state clears cart |
| `/wishlist` | Client | — | Saved/wishlisted shops |
| `/help` | Client | — | Help Center — FAQ categories, search, accordion Q&A |
| `/contact-support` | Client | — | Floating support chat widget with assistant triage and live-agent ticket handoff |
| `/login` | Client | — | Supabase Auth login — `?mode=vendor` selects the vendor lane |
| `/register` | Client | — | Customer registration |
| `/signup` | Client | — | Customer signup — `?role=vendor` sends you to the vendor host's `/vendor/register` |
| `/sell` | Server | — | Become a vendor landing page |
| `/become-courier` | Server | — | Become a courier landing page — on the courier host it is rewritten onto `/` |
| `/profile` | Client | ✅ Required | Customer profile management |
| `/vendor/dashboard` | Client | ✅ vendor/admin | Vendor dashboard — orders, revenue, listings |
| `/seller` | Client | ✅ vendor/admin | Seller management pages |
| `/courier/dashboard` | Client | ✅ courier/admin | Courier dashboard — available jobs, delivery tracking; served at `/dashboard` on the courier host |
| `/courier/register` | Client | — | Courier application form — the same path on every host |
| `/admin/support` | Client | ✅ admin | Internal support agent console — queue, assignment, replies, resolution |
| `/terms` | Server | — | Terms of service |
| `/privacy` | Server | — | Privacy policy |

## Architecture Patterns

### Middleware & Auth
`src/middleware.ts` handles all route protection using Supabase SSR:
- `AUTH_REQUIRED` routes (`/profile`, `/checkout`) → redirect to `/login?redirect=<path>` if no session
- `ROLE_REQUIRED` routes → additionally checks `profiles.role` from DB
  - `/vendor/dashboard`, `/seller` → `["vendor", "admin"]`
  - `/courier/dashboard` → `["courier", "admin"]`
  - `/admin` → `["admin"]`
- Roles: `customer` | `vendor` | `courier` | `admin`

### Multi-Host Setup (vendor center + courier hub)
The customer site, the vendor center, and the courier hub are **one deployment serving three
hostnames**: `greenpackdelight.com`, `vendor.greenpackdelight.com`, and
`courier.greenpackdelight.com`. No separate app, no extra cost.

The vendor center and the courier hub are built the same way — a small set of clean URLs
rewritten onto existing routes behind a closed-host allow-list, with storefront chrome
suppressed — so the vendor section below is the reference and the courier section that follows
notes only where it deliberately differs.

`src/middleware.ts` detects the vendor host (`isVendorHost` from `src/lib/hosts.ts`, which reads
the `host` header — **never** `x-forwarded-host`, which clients can append to) and rewrites clean
vendor URLs onto the existing `/seller/*` routes:

| Vendor-host URL | Renders |
|---|---|
| `/` | *redirects* to `/dashboard` |
| `/dashboard` | `/seller/dashboard` |
| `/shop` | `/seller/shop` |
| `/services` | `/seller/services` |
| `/products` | `/seller/products` |
| `/payout` | `/seller/payout` |
| `/onboarding` | `/seller/onboarding` |

`/` is a redirect rather than a rewrite on purpose: serving the dashboard at `/` would make it
indistinguishable from the customer homepage, and `AppChrome` has only the pathname to go on.

**The vendor host is closed.** `isVendorHostPathAllowed()` in `src/middleware.ts` allows the six
rewrite targets (matched *exactly* — `/shop/xyz` is the storefront's shop page, not the vendor's
shop editor), the `/seller/*` routes they rewrite onto, `/sell`, `/vendor/register`, `/login`,
`/reset-password`, `/api/*`, `/not-found`, `/_next`, and any path whose last segment looks like a
file. Everything else — `/browse`, `/cart`, `/wishlist`, the customer `/register` and `/signup` —
redirects to `/dashboard`, which itself bounces a signed-out visitor to `/login?mode=vendor`. So
there is no customer page on the vendor host, no chrome-less dead end, and no route back to the
store but the address bar. `/_next` is in the list deliberately: the matcher does **not** exclude
`/_next/webpack-hmr`, and redirecting it breaks HMR.

**Chrome is decided by host, not path.** `src/app/layout.tsx` reads `headers()`, computes
`isVendorHost` and `isCourierHost` from that one call, and passes `onVendorHost` / `onCourierHost`
to `AppChrome` as props — not a client-side `window.location.hostname` read, which would flash the
Header before hydration. `AppChrome` short-circuits to bare `children` when either is set. The path
lists it keeps are for the **customer** host, where `/seller/*` and `/courier/*` still resolve
directly and must not wear storefront chrome either: `STANDALONE_PREFIXES =
["/seller", "/courier", "/admin/support"]` and `STANDALONE_EXACT = ["/vendor/register"]`.
`/become-courier` is *not* under `/courier`, so the public pitch page keeps storefront chrome on the
customer host — correct, it is a marketing page.

Reading `headers()` costs nothing: the site is already fully dynamic (`db.ts` → `supabase/server.ts`
→ `await cookies()`), so the root layout's rendering mode is unchanged.

The clean vendor names (`/dashboard`, `/shop`, …) are deliberately **absent** from
`STANDALONE_EXACT`. They only exist through the vendor host's rewrite, and everything on that host
renders bare via `onVendorHost` — so listing them would be dead configuration that looks
load-bearing. They fail together with host detection too: if the host is ever misread, middleware
stops rewriting `/dashboard` as well and the path never renders.

`usePathname()` reports the **browser** path, not the rewrite target, so it is the *clean* name that
would match — which is why the host gate, not the path list, is what actually suppresses chrome on
vendor pages.

The vendor host has **no clean `/register` and no `/signup`**: both are customer routes, and both are
outside the allow-list, so they redirect to `/dashboard` there. Vendor registration lives at
**`/vendor/register`** — the same path on both hosts, unambiguous, and chrome-free.

`/seller/*` also still resolves directly, so existing internal links keep working.

**The courier hub.** Same machinery, much smaller surface — a courier has one page of
dashboard, not six sections of management, so there is nothing to rewrite beyond it:

| Courier-host URL | Renders |
|---|---|
| `/` | `/become-courier` (the pitch, *rewritten*, not redirected) |
| `/dashboard` | `/courier/dashboard` |
| `/courier/register` | the application form — same path on both hosts |
| `/login` | the plain **customer** lane |
| `/terms`, `/privacy` | not served here; `/courier/register` links them absolutely |

`/` is a **rewrite** here, unlike the vendor host where it *redirects* to `/dashboard`. The
vendor redirect exists because serving the *dashboard* at `/` would make it indistinguishable
from the customer homepage. A marketing landing at `/` has no such ambiguity.

**No `mode=courier` login lane.** Couriers have **no split identity** — same account, real
email, `profiles.role` flipping `customer`→`courier` on admin approval (see
`src/lib/vendor-identity.ts` for the vendor contrast). The customer lane is already correct, so
`/login` on the courier host is not forced to anything.

**No clean `/register` either.** Courier registration stays at `/courier/register` on both
hosts, mirroring the `/vendor/register` precedent.

`isCourierHostPathAllowed()` allows `/` and `/dashboard` (exact), `/courier/*`, `/login`,
`/reset-password`, `/api/*`, `/not-found`, `/_next`, and the file-request fallback. Everything
else redirects to `/dashboard`. `/become-courier` is in the exact list too: it is the rewrite
*target* of `/`, so a visitor arriving on the hub from a stale absolute link to
`courier.greenpackdelight.com/become-courier` should still see the pitch rather than a bounce.

**The courier hub's clean names live in `COURIER_REWRITES`, and `rewriteTo` picks the map by
host** — `onVendorHost ? VENDOR_REWRITES : onCourierHost ? COURIER_REWRITES : undefined`. That
is what feeds `effectivePathname` (`/dashboard` → `/courier/dashboard`) and therefore what makes
`ROLE_REQUIRED["/courier/dashboard"]` match on the hub. `isVendorHost` is tested first: the two
can never both be true for one hostname (different first labels), so the order only matters if
an env var is ever misconfigured to point at the other's host, and the vendor host is the older,
more load-bearing one.

**The `/courier/*` routes bring their own chrome.** `src/app/courier/layout.tsx` is a thin
Server Component — it keeps the section's `metadata` — wrapping
`src/components/courier/CourierShell.tsx`, which is the Client Component that renders the sticky
top bar and the Logout button. The split is forced: a `"use client"` module cannot export
`metadata`, and the shell needs `usePathname()` to render `/courier/register` **bare**. That
comparison is exact and safe because `/courier/register` is never rewritten — only `/` and
`/dashboard` are — so the rewritten dashboard path fails the equality and gets the shell.

The shell exists because the courier dashboard previously had **no chrome of its own**: it
inherited the storefront Header, and the storefront Header was where its sign-out lived.
Suppressing that without a replacement would leave a signed-in courier with no way out.

Two deliberate differences from the seller shell:

- **It has a "← Back to GreenPack" link.** Rule 4 below says the vendor center has none; a
  vendor's shopping session is a *different account*, whereas a courier's is the *same* one, so
  stranding them would be gratuitous. `siteUrl("/")` is absolute, so it resolves on both hosts.
- **Logout lands on `/login` with no `mode`**, because there is no courier lane to select.

**Why this exists:** Supabase session cookies are host-only, so each hostname gets an independent
session. Logging into the vendor center no longer replaces the customer session. For the courier
hub that independence is a **side effect, not the goal** — a courier's account *is* their
customer account, but the cookie still cannot cross, so after signing in on the hub they are a
guest on `greenpackdelight.com` until they sign in there too. Widening the cookie to
`.greenpackdelight.com` was considered and rejected: it would re-couple the vendor center.

Rules that keep it working — breaking any of them silently re-couples the hosts:

1. **Sign-out is always `scope: "local"`, never `"global"`.** Global revokes the refresh token
   server-side for the whole user, which would sign them out of *every* host. Applies to
   `src/app/seller/layout.tsx`, `src/components/courier/CourierShell.tsx`, and
   `src/context/AuthContext.tsx`.
2. **Cross-host links must be absolute.** Use `vendorUrl()` / `courierUrl()` / `siteUrl()` from
   `src/lib/hosts.ts`. A bare `/` or `/dashboard` stays on whichever host rendered it.
3. **"Become a Vendor" / "Sell on GreenPack" links point at the vendor host and open in a new tab**
   (`vendorUrl("/sell")` + `target="_blank"`). They live in `Header`, `MobileNav`, `Footer`, and
   `CTABanner` — change all four together or the entry points drift apart. The courier
   equivalents (`courierUrl("/")`) live in `Header`, `MobileNav`, and `Footer` — there is no
   courier link in `CTABanner` — and also open in a new tab.
4. **The vendor center has no link back to the customer site** — the "← Back to site" button was
   removed deliberately. The seller header's logo still points at `/`, which on the vendor host
   resolves to `/dashboard`.
5. **Vendor-facing links out of a shared page use `vendorUrl()` for both the host and the path.**
   `src/app/sell/page.tsx` renders on both hosts, so its "Register Your Business" buttons point at
   `vendorUrl("/vendor/register")` and "Log in to your dashboard" at `vendorUrl("/login?mode=vendor")`.
   A bare `/vendor/register` would follow whichever host rendered the page, and a bare `/login`
   opens the **customer** lane — which is exactly the bug those two links previously had.
6. **Post-login redirects stay on the host that owns the session.** A vendor's cookie only exists on
   the host they signed in on, so `src/app/login/page.tsx` picks `vendorUrl`'s clean `/dashboard`
   only when it is already on the vendor host, and `/seller/dashboard` otherwise. Jumping hosts
   there lands them on a signed-out page. The courier case is the same shape with one extra twist:
   `/browse` — the default landing spot for a signed-in non-vendor — is outside the courier
   allow-list, so on the hub the default becomes `siteUrl("/browse")`. Without that, a non-courier
   signing in on the hub bounces through `/dashboard` (fails the role check) back to `/`, i.e. the
   "become a courier" advert.
7. **A page that renders on more than one host must read `headers()` to pick its links.**
   `src/app/become-courier/page.tsx` is served directly on the customer host *and* as the `/`
   rewrite target on the hub, so its "Log in to your dashboard" link has to follow:
   `onCourierHost ? "/login?redirect=/dashboard" : "/login?redirect=/courier/dashboard"`.
   Otherwise the hub leaks `/courier/dashboard` into the address bar at the exact moment a courier
   signs in — the thing its clean URLs exist to avoid. Same rule for
   `src/app/api/auth/reset/request/route.ts`, which must return a recovery link on the origin that
   asked: GoTrue builds the session on whichever origin the link points at, so a reset started on
   the hub that returns to the customer site leaves the hub signed out, which reads as the reset
   having silently failed. `src/app/api/auth/callback/route.ts` needs it only for the default
   `next` (`/dashboard` on either closed host — `/` is the pitch on the hub, so it would drop a
   signed-in courier on the advert); its vendor-lane backstop does not extend to couriers, because
   a courier sign-in can only ever be *started* on the hub — there is no `mode=courier` to carry
   across hosts — so `origin` is already the host that owns the session.

Vendor sign-out lands on `/login?mode=vendor`, and middleware forces that lane for any `/login`
request on the vendor host, so a vendor never sees the customer sign-in copy.

**That forcing is a redirect, and it must stay one.** `/login` is a Client Component that reads the
lane through `useSearchParams()`, which reflects the **browser** URL. A rewrite — the obvious
"optimization", since it hides the ugly query string — injects `mode=vendor` into the server render
only; the client then hydrates against the bare `/login`, recomputes `isVendorIntent` as `false`,
and throws the vendor copy away. The page flashes the right heading and settles on the customer
one. This is the same trap as `usePathname()` reporting the browser path rather than the rewrite
target; the rule is that **anything a client component reads off the URL must be delivered by
redirect, not rewrite.**

**Both closed hosts exempt `/login` from the guest-only bounce.** `AUTH_ONLY_GUEST` normally
sends a signed-in visitor straight to their dashboard, and that is what the customer host still
does. On a closed host `/login` is the front door — every other route there redirects to
`/dashboard` — so bouncing off it would leave signing out as the only way to reach it. The visible
symptom is a link explicitly labelled "Log in to your dashboard" (on `/sell`, and on
`/become-courier`) silently entering whichever account the cookie already holds, which reads as
the site signing you in by itself. The exemption is `isClosedHostLoginPage =
(onVendorHost || onCourierHost) && effectivePathname === "/login"` in `middleware.ts`; `/register`
still bounces.

The guest-only bounce's target is host-aware too: a signed-in **courier** leaving `/login` goes to
`onCourierHost ? "/dashboard" : "/courier/dashboard"`, for the same clean-URL reason as rule 6.

Auth matching in middleware runs against the **rewritten** path (`effectivePathname`), not the
incoming one — otherwise `/` on the vendor host doesn't match `ROLE_REQUIRED["/seller/dashboard"]`
and unauthenticated visitors get the dashboard shell.

Env: `NEXT_PUBLIC_VENDOR_URL`, `NEXT_PUBLIC_COURIER_URL`, and `NEXT_PUBLIC_SITE_URL` (all optional
in production — the defaults in `hosts.ts` are the real domains). Locally set them to
`http://vendor.localhost:3000`, `http://courier.localhost:3000`, and `http://localhost:3000`;
`vendor.localhost` and `courier.localhost` are also listed in `allowedDevOrigins` in
`next.config.ts` (a missing entry there shows up as unstyled headings or half-loaded pages in dev,
because Next.js blocks the cross-origin dev CSS/HMR requests).

**Supabase Redirect URLs — all six, and they are not interchangeable:**

```
http://localhost:3000/**                 ← customer lane, local
http://vendor.localhost:3000/**          ← vendor lane, local
http://courier.localhost:3000/**         ← courier hub, local
https://greenpackdelight.com/**          ← customer lane, production
https://vendor.greenpackdelight.com/**   ← vendor lane, production
https://courier.greenpackdelight.com/**  ← courier hub, production
```

Supabase matches the **full origin**, so `localhost` does not cover `vendor.localhost` or
`courier.localhost` — they are different hosts, and a wildcard on one does not cover the others.
Each missing entry costs one host in one environment.

The failure mode is quiet and easy to misread: an unlisted `redirectTo` is **not** rejected.
GoTrue silently discards it and substitutes the project's **Site URL**, so a Google sign-in started
on the vendor host comes back to production instead of to the dev server. Nothing errors, no code
is wrong, and it looks like an OAuth bug in the app. Leave Site URL pointed at production — it is
the fallback for everything unlisted, and pointing it at localhost would break real sign-ins.

### Vendor Accounts (split identity)
One email, **two accounts**. A person who shops and sells with `user@example.com` has a customer
account and a separate vendor account — separate `auth.users` rows, separate passwords, separate
sessions. `profiles.role` still means exactly what it always did; what changed is that a vendor
account is no longer a role worn by the customer row.

`auth.users.email` is unique, so two rows cannot both own `user@example.com`. The vendor row is
therefore keyed on an internal address, while the address the person actually typed lives in
`profiles.email` (nullable, deliberately **not** unique — unique only among vendors, via a partial
index):

| | `auth.users.email` | `profiles.email` |
|---|---|---|
| Customer account | `user@example.com` | `user@example.com` |
| Vendor account | `v.<uuid>@vendors.greenpackdelight.com` | `user@example.com` |

`src/lib/vendor-identity.ts` is the **only** place that constructs or interprets a vendor auth
address. `makeVendorAuthEmail()` mints one, `findVendorIdentity()` resolves a typed email to the
vendor account registered under it, `createVendorAccount()` builds the pair.

**Never display `user.email` on a vendor surface.** For a vendor it is the internal address. Read
`profile.email` instead (`/api/profile`, `/api/seller/payout`, `/api/vendor/register`). Customer
surfaces are unaffected — a customer's two addresses are identical.

Each sign-in path resolves the lane before authenticating, because the typed email is *not* the
address a vendor signs in with:

- **Password / OTP** — `email-otp/start` and `complete` take `mode`; the vendor lane signs in
  against `resolveVendorAuthEmail(email)`. The OTP row and the emailed code stay on the typed
  address, so the code lands in the right inbox.
- **Password reset** — `reset/request` takes `mode`, generates the recovery link for the vendor
  row, and redirects to the vendor host so the session lands in the vendor cookie jar. Aimed at an
  email with no vendor account it stops rather than mailing a link that would reset the *customer*
  password.
- **Google** — the interesting one. Google can only ever prove the address; it cannot say "this is
  the vendor John." `handleGoogleSignIn` passes `mode` to `/api/auth/callback`, which exchanges the
  code and then, on the vendor lane, resolves the email to a vendor account, signs the Google
  session out (`scope: "local"`), and mints a vendor session via
  `generateLink({ type: "magiclink" })` → `verifyOtp({ token_hash, type: "magiclink" })`. No vendor
  account → sign out and go to `/vendor/register`, never silently granting the customer session on
  a vendor page. The trust boundary holds: Google asserted control of the address, and we map it to
  the vendor account registered under it.

**The vendor lane finishes on the vendor host, whatever host the callback was served from.**
`handleGoogleSignIn` refuses to *start* the round-trip anywhere else — off the vendor host it hands
the browser to `vendorUrl("/login?mode=vendor")` first — and the callback redirects with
`new URL(safeNext, VENDOR_ORIGIN)` rather than the request's own `origin`. Both halves are needed,
and the second is the non-obvious one: `origin` is merely wherever the browser landed, and because
Supabase session cookies are **host-only**, landing on the wrong host means landing *signed out*.
The failure is not subtle either — the default `next` is `/dashboard`, which exists only on the
vendor host, so a vendor-lane callback served from the customer host builds
`http://localhost:3000/dashboard` and 404s. A vendor-lane callback that still arrives on the
customer host is a backstop case (stale link, hand-built URL): it signs the just-exchanged customer
session out and restarts on the vendor host.

Redirect URLs must therefore cover **both** origins — `http://vendor.localhost:3000/**` alongside
`http://localhost:3000/**` locally. GoTrue matches on the full origin, and an unlisted one is
**silently substituted with the project's Site URL** (`https://greenpackdelight.com`), which is the
"Google bounces me to the live site" symptom. There is no error to read. To check what GoTrue
actually decided, hit `/auth/v1/authorize?provider=google&redirect_to=…` and read the resulting
`auth.flow_state.referrer` — it stores the sanitized value.

Two smaller consequences:

- `createVendorAccount()` creates the auth row with `user_metadata.contact_email`, and
  `handle_new_user()` (migration 017) prefers that over `new.email`, so a new profile's
  `profiles.email` is the visible address from the first write.
- A **customer account on the same email is not a conflict** when registering as a vendor — that is
  the feature. Only a second *vendor* account for one email is rejected, in the app layer and by the
  partial unique index.

Vendors registered before migration 017 keep signing in on their real-email row: the backfill gives
them a `profiles.email`, so `findVendorIdentity()` finds them, and their `authEmail` comes back as
the real address. They are not split, and not broken.

### Database Access Layer (`src/lib/db.ts`)
Single source of truth for all data queries. Auto-detects Supabase config:
- **Supabase configured** → queries `shops`, `services`, `products`, `reviews` tables
- **Not configured** → falls back to mock TypeScript data in `src/lib/data/`

Key functions: `dbGetShops()`, `dbGetShopById()`, `dbGetServicesByShopId()`, `dbGetProductsByShopId()`, `dbGetReviewsByShopId()`, `dbGetFeaturedShops()`

Row mappers convert Supabase `snake_case` to app `camelCase` types.

### Supabase Clients
Use the correct client for context:

| File | Use When |
|------|----------|
| `src/lib/supabase/client.ts` | Client components (`"use client"`) |
| `src/lib/supabase/server.ts` | Server Components, Route Handlers, Middleware |
| `src/lib/supabase/admin.ts` | Route Handlers that need to bypass RLS (service_role) — **never expose to client** |

### SMS Notifications (Termii)
`src/lib/termii.ts` — Nigerian SMS via Termii API (`api.ng.termii.com`). Mock-logs when `TERMII_API_KEY` is not set.
- `notifyCouriersOfJob(jobId, phones[])` — new delivery job alert
- `notifyCustomerCourierAssigned(phone, name, courierPhone)` — courier on the way
- `notifyVendorItemArrived(phone, orderRef)` — courier at vendor pickup
- `notifyCustomerDeliveryComplete(phone, orderRef)` — delivery done
- Auto-normalizes Nigerian phone numbers to international format (`0xxx` → `234xxx`)

### OTP Verification
`verification_otps` table stores 6-digit codes (email/phone), TTL 10 min, auto-cleaned via DB trigger. API route `/api/verify` handles validation. `OTPInput` and `PasswordStrength` components live in `src/components/auth/`.

### Server vs Client Components
Server Components by default. Only add `"use client"` when the component needs:
- React hooks (useState, useEffect, useContext)
- Event handlers (onClick, onChange)
- Browser APIs

**Client components**: CartContext, SearchBar, MobileNav, FilterBar, VideoShowcase, ProductCard, ServiceCard, CartItem, CartItemList, CartSummary, ThemeToggle, FAQAccordion, CategoryCard, CourierShell, cart/page, checkout/page, help/page, wishlist/page, profile/page, login/page, register/page, signup/page, vendor/dashboard/page, courier/dashboard/page

### State Management
- **Cart**: `src/context/CartContext.tsx` — React Context + `useReducer`
  - Actions: `ADD_ITEM`, `REMOVE_ITEM`, `UPDATE_QUANTITY`, `UPDATE_NOTES`, `CLEAR_CART`
  - Access via `useCart()` hook from `src/hooks/useCart.ts`
- **Theme**: Managed by `next-themes` ThemeProvider in `src/components/providers/ThemeProvider.tsx`
- **Auth**: Supabase session (SSR cookie-based, persisted across server/client)
- **Search/Filter**: URL search params (`searchParams`) on browse page — no client state

### Path Alias
`@/*` maps to `./src/*` (configured in `tsconfig.json`)

## Database Schema (Supabase)

### Tables
| Table | Description |
|-------|-------------|
| `profiles` | Extends `auth.users` — role, full_name, phone, avatar_url, DOB, email/phone_verified, terms_accepted, **`email`** (the address the user typed; may repeat across a customer and a vendor row) |
| `shops` | Vendor shop listings — owner_id, slug, category, location (JSONB), contact (JSONB), images (JSONB), video (JSONB), tags, is_verified, is_featured |
| `services` | Shop services — price, price_type (fixed/from/hourly), duration, is_available |
| `products` | Shop products — price, original_price, image, in_stock, quantity |
| `reviews` | Customer reviews — rating, comment, customer_name/avatar |
| `orders` | Customer orders |
| `deliveries` | Courier delivery jobs |
| `verification_otps` | 6-digit OTP codes — identifier (email/phone), type, expires_at, used |
| `support_tickets` | Customer support tickets (queued/assigned/resolved) |
| `support_messages` | Support chat messages linked to tickets |

### Triggers
- `on_auth_user_created` → auto-creates `profiles` row on signup with role from `raw_user_meta_data`, and `email` from `contact_email` (the split vendor's real address) falling back to `new.email`
- `trg_guard_profile_role` → blocks role changes except by an admin or the service role
- `trg_cleanup_otps` → deletes expired OTPs (>1hr) on each insert

## Styling Conventions

### Dark Mode Color Mapping
Apply these consistently when adding dark mode to new components:

| Light | Dark | Usage |
|-------|------|-------|
| `bg-white` | `dark:bg-gray-900` | Page/panel backgrounds |
| `bg-gray-50` | `dark:bg-gray-900/50` | Section backgrounds |
| `bg-gray-100` | `dark:bg-gray-800` | Image placeholders, subtle bg |
| `bg-green-100` | `dark:bg-green-900/30` | Icon circles, highlights |
| `text-gray-900` | `dark:text-white` | Headings |
| `text-gray-700` | `dark:text-gray-300` | Labels, secondary text |
| `text-gray-600` | `dark:text-gray-400` | Body text |
| `text-gray-500` | `dark:text-gray-400` | Muted text |
| `text-green-600` | `dark:text-green-400` | Links, prices, accents |
| `border-gray-200` | `dark:border-gray-700` | Card/section borders |
| `border-gray-300` | `dark:border-gray-600` | Input borders |
| `hover:bg-gray-100` | `dark:hover:bg-gray-800` | Hover states |
| `focus:ring-green-200` | `dark:focus:ring-green-900` | Focus rings |

### General Rules
- Green-themed branding (green-50 through green-950 palette)
- `cn()` utility from `src/lib/utils.ts` for conditional class merging
- Mobile-first responsive: 1-col → 2-col (`md:`) → 3-col (`lg:`)
- Inter font via `next/font/google` + Material Symbols Outlined icons via Google Fonts CDN
- Framer Motion on interactive elements (Button `whileTap`, Card `whileHover`)
- Page background: `bg-[#f6f8f7]` light / `dark:bg-gray-900`

### Image Handling
- Use `next/image` with `unoptimized` for external placeholder URLs (placehold.co)
- Add `placeholder="blur"` and `blurDataURL={BLUR_PLACEHOLDER}` to all images
- `BLUR_PLACEHOLDER` is a green-tinted SVG base64 constant from `src/lib/utils.ts`

## Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service role (server-only, never expose)
TERMII_API_KEY=                    # Termii SMS API key
SUPPORT_AGENT_API_KEY=             # Shared secret for backend agent event ingestion
NEXT_PUBLIC_SITE_URL=              # Customer-site origin (optional; hosts.ts defaults to the real domain)
NEXT_PUBLIC_VENDOR_URL=            # Vendor-center origin (optional; defaults to vendor.greenpackdelight.com)
NEXT_PUBLIC_COURIER_URL=           # Courier-hub origin (optional; defaults to courier.greenpackdelight.com)
```

## Key Files Reference
| File | Purpose |
|------|---------|
| `src/lib/constants.ts` | Site name, currency symbol, config values |
| `src/lib/utils.ts` | All utility/query functions + BLUR_PLACEHOLDER |
| `src/lib/db.ts` | Supabase data access layer with mock fallback |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client |
| `src/lib/supabase/admin.ts` | Admin/service-role client (server only) |
| `src/lib/termii.ts` | Termii SMS notification helpers |
| `src/lib/vendor-identity.ts` | Split vendor/customer account identity — the only place a vendor auth address is built or read |
| `src/lib/hosts.ts` | Multi-host helpers — `isVendorHost()`, `isCourierHost()`, `vendorUrl()`, `courierUrl()`, `siteUrl()` |
| `src/types/index.ts` | All TypeScript interfaces |
| `src/context/CartContext.tsx` | Cart state provider |
| `src/hooks/useCart.ts` | Cart hook |
| `src/middleware.ts` | Auth + role-based route protection + the closed vendor and courier hosts |
| `src/components/layout/AppChrome.tsx` | Suppresses storefront Header/Footer on the closed hosts and standalone routes |
| `src/components/courier/CourierShell.tsx` | The courier hub's own top bar + Logout (its layout must stay a Server Component to export `metadata`) |
| `src/app/globals.css` | Global styles, dark mode body, scrollbar |
| `tailwind.config.ts` | Theme colors, dark mode config, animations |
| `supabase/migrations/001_initial_schema.sql` | Core DB schema |
| `supabase/migrations/002_verification_and_profile_update.sql` | OTP + profile fields |
| `supabase/migrations/017_vendor_accounts.sql` | `profiles.email` + vendor-only uniqueness + trigger email |

## Goals Folder Workflow

`goals/ACHIVED.md` is the user's prompt queue (the folder lives at the repo
root, *outside* the worktree, and is intentionally untracked — it holds the
user's working notes, not project source). Whenever the user asks you to
"execute the goals", "run the goals folder", or otherwise act on this file:

1. **Read `goals/ACHIVED.md`** and compute a hash of its contents
   (`sha256sum /mnt/c/Users/enejo/Desktop/GreenPack/goals/ACHIVED.md | awk '{print $1}'`).
2. **Compare against `goals/.last-executed`** — a single-line file in the
   same folder storing the hash of the prompt that was last executed.
   Because the folder isn't tracked in git, this marker is local-only;
   that's fine — it only needs to survive between sessions on the same
   machine.
3. **If the hashes match**: the prompt has already been run. Say so in one
   sentence and stop. Do NOT re-execute — repeating completed work wastes
   tokens and can re-introduce churn.
4. **If the hashes differ (or `.last-executed` is missing)**: execute the
   prompt end-to-end. After the work is committed and pushed to `master`,
   overwrite `goals/.last-executed` with the new hash.

Always run the comparison before touching code. The marker file is the
single source of truth for "what has been executed". If the user explicitly
says "re-run" or "ignore the marker", honor that and overwrite the marker
after.

## Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `/feature-builder` | "add X to GreenPack", "build a new feature", "implement X" | Plans and implements new features end-to-end following all project conventions. Gathers requirements, explores code, plans, implements, updates CLAUDE.md, and verifies the build. |
