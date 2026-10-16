# GreenPack

## Overview
GreenPack (brand: **Green Pack Delight**) is a Nigerian service and shop discovery platform. Vendors list businesses with video showcases, products, and services (laundry, barbershop, phone repair, fashion, food, etc.). Customers browse, discover, and connect with providers via phone, WhatsApp, or inquiry form. Couriers handle deliveries end-to-end.

**Backend**: Supabase (PostgreSQL + Auth + RLS). Falls back to mock TypeScript data when `NEXT_PUBLIC_SUPABASE_URL` is not configured.

## Tech Stack
- **Next.js 16.2.6** — App Router, TypeScript, Turbopack
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
│   │   ├── dashboard/page.tsx      # Dashboard — also the entry point to /seller/elite
│   │   ├── shop/page.tsx           # Shop editor (category picker is grouped)
│   │   └── elite/page.tsx          # Elite Partner — status card + application form
│   ├── admin/
│   │   ├── layout.tsx              # Admin layout — Server Component (keeps `metadata`), renders AdminShell
│   │   ├── page.tsx                # Chooser — the three action queues, plus the support console
│   │   ├── couriers/page.tsx       # Courier applications queue
│   │   ├── vendors/page.tsx        # Elite applications queue
│   │   ├── outreach/page.tsx       # Image outreach — email the owners of shops missing images
│   │   └── support/page.tsx        # Support agent console
│   ├── courier/
│   │   ├── layout.tsx              # Courier layout — Server Component (keeps `metadata`), renders CourierShell
│   │   ├── register/page.tsx       # Courier application form — same path on all hosts
│   │   └── dashboard/page.tsx      # Courier dashboard (role: courier/admin) — served at /dashboard on the hub
│   ├── terms/page.tsx              # Terms of service
│   ├── privacy/page.tsx            # Privacy policy
│   └── api/
│       ├── admin/
│       │   ├── couriers/           # Courier queue + per-application review (admin)
│       │   ├── outreach/           # GET the unlisted queue | POST a test or a real send (admin)
│       │   └── vendors/            # Elite queue + per-application review (admin)
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
│       ├── seller/elite/           # GET own application | POST apply (vendor session)
│       ├── seller/shop/image/      # AI shop image — complete but DORMANT: no UI caller today
│       ├── shops/                  # Shops CRUD
│       ├── support/
│       │   ├── tickets/            # Customer support tickets + chat messages API
│       │   └── agent/
│       │       ├── events/         # Agent webhook-style events (assign/reply/resolve/reopen)
│       │       └── tickets/        # Admin agent console APIs (list/manage tickets/messages)
│       ├── upload/                 # POST — image upload to Supabase Storage, validated by magic
│       │                           # bytes (never the client's declared MIME)
│       └── verify/                 # OTP verification endpoint
├── components/
│   ├── ui/           # Button, Card, Badge, Rating, PriceTag, Input, EmptyState, Skeleton, Toaster,
│   │                 # ImageUpload, ImageGalleryUpload, MakeImageWithGoogle, VideoUpload
│   ├── layout/       # Header, Footer, MobileNav, SearchBar, ThemeToggle, AppChrome
│   ├── courier/      # CourierShell — the courier hub's own top bar (no sidebar; it is one page)
│   ├── admin/        # AdminShell — the console's top bar, its five-page nav, and a sign-out
│   ├── providers/    # ThemeProvider (next-themes wrapper)
│   ├── auth/         # OTPInput, PasswordStrength
│   ├── home/         # HeroSection, TrendingShops, FeaturedShops, DiscoveryWall, ShopTile,
│   │                 # VideoHighlights, HowItWorks, StatsBand, TrustSection, CTABanner
│   │                 # (no CategoryNav — the homepage's category entry point is CategoryRail,
│   │                 # which lives with the browsing UI in components/browse/)
│   ├── browse/       # CategorySidebar (+ its CategoryRail named export, the homepage's
│   │                 # collapsed rail), ShopCard, ShopGrid, FilterBar — sidebar and rail
│   │                 # share one SubcategoryPanel, so the taxonomy renders from one place
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
│   ├── hosts.ts      # Multi-host helpers — isVendorHost(), isCourierHost(), isAdminHost(), vendorUrl(), courierUrl(), adminUrl(), siteUrl()
│   ├── utils.ts      # formatPrice, filterShops, cn(), BLUR_PLACEHOLDER, etc.
│   └── constants.ts  # SITE_NAME, CURRENCY, CURRENCY_SYMBOL
├── hooks/            # useCart.ts, useSearch.ts
├── context/          # CartContext.tsx (useReducer: ADD, REMOVE, UPDATE, CLEAR)
├── middleware.ts     # Auth + role-based route protection + the closed vendor, courier, and admin hosts
└── types/            # index.ts (Shop, Service, Product, Review, CartItem, etc.)

supabase/
└── migrations/
    ├── 001_initial_schema.sql                       # profiles, shops, services, products, orders, reviews, deliveries
    └── 002_verification_and_profile_update.sql      # verification_otps, profile fields (DOB, email/phone_verified, terms)
  └── 003_support_tickets.sql                      # support_tickets, support_messages, RLS policies
  └── … up to 016
  └── 017_vendor_accounts.sql                      # profiles.email, vendor-only unique index, handle_new_user() email
  └── 018_elite_vendors.sql                        # shops.is_elite, elite_applications, trg_guard_shop_elite
  └── 019_backfill_shop_category_ids.sql           # slug→id repair for seeded category_id (no-op in prod)
  └── 020_shop_image_generations.sql               # AI shop-image usage ledger — the per-vendor daily cap
  └── 021_shop_images_complete.sql                 # shops.images_complete generated column — the display rule in SQL
  └── 022_shop_image_outreach.sql                  # image-outreach send ledger — server-written, RLS with no policies
```

`src/lib/vendor-identity.ts` — the one home for the split vendor/customer identity rule (see
**Vendor Accounts**).

## Routes

| Route | Type | Auth | Description |
|-------|------|------|-------------|
| `/` | Server | — | Homepage — hero, then shops (trending, featured, discovery). **No category grid in the body**: the only category affordance is a collapsed `absolute` **top-left** rail (`CategoryRail`), whose subcategory panels expand rightward on hover. It sits over the hero and scrolls away with it — it must never hang over a section below |
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
| `/seller/elite` | Client | ✅ vendor/admin | Elite Partner — apply, and see the status of an application; `/elite` on the vendor host |
| `/courier/dashboard` | Client | ✅ courier/admin | Courier dashboard — available jobs, delivery tracking; served at `/dashboard` on the courier host |
| `/courier/register` | Client | — | Courier application form — the same path on every host |
| `/admin` | Server | ✅ admin | Chooser — links the three review queues and the support console |
| `/admin/vendors` | Client | ✅ admin | Elite applications queue — approve grants homepage placement, decline explains itself |
| `/admin/support` | Client | ✅ admin | Internal support agent console — queue, assignment, replies, resolution |
| `/admin/couriers` | Client | ✅ admin | Courier applications queue — approve flips the applicant's `profiles.role` to `courier` |
| `/admin/outreach` | Client | ✅ admin | Image outreach — email the owners of shops that are missing images, one at a time or in bulk |
| `/terms` | Server | — | Terms of service |
| `/privacy` | Server | — | Privacy policy |

Every `/admin/*` route above is served on the **admin console host**, not the customer site —
`greenpackdelight.com/admin` hands over to `admin.greenpackdelight.com` (see **Multi-Host Setup**).
The paths do not change there, so this table describes the console host directly. Neither the
`/admin` entry in `ROLE_REQUIRED` nor `hideIfUnauthorized`'s `/admin` prefix needs a per-page
addition: both match by prefix, so `/admin/couriers`, `/admin/vendors`, `/admin/outreach`, and
`/admin/support` are covered by the one entry.

## Architecture Patterns

### Middleware & Auth
`src/middleware.ts` handles all route protection using Supabase SSR:
- `AUTH_REQUIRED` routes (`/profile`, `/checkout`) → redirect to `/login?redirect=<path>` if no session
- `ROLE_REQUIRED` routes → additionally checks `profiles.role` from DB
  - `/vendor/dashboard`, `/seller` → `["vendor", "admin"]`
  - `/courier/dashboard` → `["courier", "admin"]`
  - `/admin` → `["admin"]`
  - `/seller/elite` → `["vendor", "admin"]`, listed separately from `/seller` so the
    closed-host rewrite `/elite` → `/seller/elite` is covered by an explicit entry rather than
    by prefix luck
- Roles: `customer` | `vendor` | `courier` | `admin`

Matching is `effectivePathname.startsWith(route)`, so every sub-path of a protected route inherits
its check — `/admin/vendors` is covered by the `/admin` entry and needs no configuration of its
own. An unauthorized visitor is **rewritten** to `/not-found` with a 404 rather than redirected;
`hideIfUnauthorized` in `middleware.ts` applies that to anything under `/admin`, again by prefix.

### Multi-Host Setup (vendor center + courier hub + admin console)
The customer site, the vendor center, the courier hub, and the admin console are **one deployment
serving four hostnames**: `greenpackdelight.com`, `vendor.greenpackdelight.com`,
`courier.greenpackdelight.com`, and `admin.greenpackdelight.com`. No separate app, no extra cost.

The vendor center and the courier hub are built the same way — a small set of clean URLs
rewritten onto existing routes behind a closed-host allow-list, with storefront chrome
suppressed — so the vendor section below is the reference and the courier section that follows
notes only where it deliberately differs. The admin console is the **fourth** host and the **odd
one out**, twice over: it has no rewrite map (its paths are already clean), and its isolation is a
*security* property rather than a tidiness one. Two hostnames are two JavaScript origins, so an
XSS on the storefront can no longer script the console. That is containment, not exclusion —
every certificate is published to Certificate Transparency logs the day it is issued, so the
hostname is public from day one. **What keeps the public off the host is the twin gate, not the
URL.**

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
| `/elite` | `/seller/elite` |
| `/onboarding` | `/seller/onboarding` |

`/` is a redirect rather than a rewrite on purpose: serving the dashboard at `/` would make it
indistinguishable from the customer homepage, and `AppChrome` has only the pathname to go on.

**The vendor host is closed.** `isVendorHostPathAllowed()` in `src/middleware.ts` allows the seven
rewrite targets (matched *exactly* — `/shop/xyz` is the storefront's shop page, not the vendor's
shop editor), the `/seller/*` routes they rewrite onto, `/sell`, `/vendor/register`, `/login`,
`/reset-password`, `/api/*`, `/not-found`, `/_next`, and any path whose last segment looks like a
file. Everything else — `/browse`, `/cart`, `/wishlist`, the customer `/register` and `/signup` —
redirects to `/dashboard`, which itself bounces a signed-out visitor to `/login?mode=vendor`. So
there is no customer page on the vendor host, no chrome-less dead end, and no route back to the
store but the address bar. `/_next` is in the list deliberately: the matcher does **not** exclude
`/_next/webpack-hmr`, and redirecting it breaks HMR.

**Chrome is decided by host, not path.** `src/app/layout.tsx` reads `headers()`, computes
`isVendorHost`, `isCourierHost`, and `isAdminHost` from that one call, and passes `onVendorHost` /
`onCourierHost` / `onAdminHost` to `AppChrome` as props — not a client-side
`window.location.hostname` read, which would flash the Header before hydration. `AppChrome`
short-circuits to bare `children` when any of the three is set. The path
lists it keeps are for the **customer** host, where `/seller/*`, `/courier/*`, and `/admin/*` still
resolve directly and must not wear storefront chrome either: `STANDALONE_PREFIXES =
["/seller", "/courier", "/admin"]` and `STANDALONE_EXACT = ["/vendor/register"]`. The `/admin`
entry is the whole console rather than the one page that originally had no chrome of its own,
because the console now carries a shell on all five pages — the invariant is "the admin console
never wears storefront chrome", regardless of host.
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
2. **Cross-host links must be absolute.** Use `vendorUrl()` / `courierUrl()` / `adminUrl()` /
   `siteUrl()` from `src/lib/hosts.ts`. A bare `/` or `/dashboard` stays on whichever host rendered
   it.
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

**The vendor and courier hosts exempt `/login` from the guest-only bounce; the admin console does
not.** `AUTH_ONLY_GUEST` normally sends a signed-in visitor straight to their dashboard, and that
is what the customer host still does. On those two hosts `/login` is the front door — every other
route there redirects to `/dashboard` — so bouncing off it would leave signing out as the only way
to reach it. The visible
symptom is a link explicitly labelled "Log in to your dashboard" (on `/sell`, and on
`/become-courier`) silently entering whichever account the cookie already holds, which reads as
the site signing you in by itself. The exemption is `isClosedHostLoginPage =
(onVendorHost || onCourierHost) && effectivePathname === "/login"` in `middleware.ts`; `/register`
still bounces. The admin console is deliberately left out of it — see **The admin console** below
for why that omission is load-bearing rather than an oversight.

The guest-only bounce's target is host-aware too: a signed-in **courier** leaving `/login` goes to
`onCourierHost ? "/dashboard" : "/courier/dashboard"`, for the same clean-URL reason as rule 6.

Auth matching in middleware runs against the **rewritten** path (`effectivePathname`), not the
incoming one — otherwise `/` on the vendor host doesn't match `ROLE_REQUIRED["/seller/dashboard"]`
and unauthenticated visitors get the dashboard shell.

**The admin console.** Same detection, and the one host with **no rewrite map at all** — the
console keeps `/admin/*` on the subdomain, so nothing needs mapping and all five existing internal
links (`/admin`, `/admin/vendors`, `/admin/couriers`, `/admin/outreach`, `/admin/support`) keep
working untouched.
That is the whole of the change: `ADMIN_HOST_ALLOWED_PREFIXES = ["/admin", "/login",
"/reset-password", "/api", "/not-found", "/_next"]` plus the file-request fallback, and everything
else redirects to `/admin`. There is no `/dashboard` equivalent, because there is no second page to
land on.

`/` is deliberately **not** in the allow-list. The console has **no front door**: `/` bounces to
`/admin`, which 404s for anyone not signed in. Entry is by typing `/login` or `/admin`. That is
existing behaviour rather than new code — `hideIfUnauthorized` in `middleware.ts` is keyed on
`roleRoute.startsWith("/admin")`, so it is **path-based and host-agnostic** and the fourth host
inherits it for free. A 404 rewrite tells a stranger nothing; a redirect to `/login` would confirm
the route exists.

You sign in on the console through the ordinary **customer lane**. There is no `mode=admin`, for
the same reason there is no `mode=courier`: an admin's account *is* their customer account, and
`/login` on this host is not forced to anything.

**The admin host is the one closed host whose `/login` is NOT exempted from the guest-only
bounce** (see the paragraph above). For the vendor and courier hosts `/login` *is* the front
door, so bouncing off it would leave signing out as the only way back. The console's front door is
`/admin`, so leaving `/login` un-exempted is what lets `greenpackdelight.com/admin` hand a
signed-in admin straight through: the customer host redirects to
`adminUrl("/login?redirect=/admin")`, and on arrival the bounce finds a signed-in admin and
forwards to `/admin`, where the cookie is already valid. Adding the exemption later would silently
reintroduce a redundant "sign in again" step.

That cross-host redirect is rule 6's shape with one addition — it is **gated on none of the three
closed hosts**, so it cannot fire anywhere but the customer host:
`!onVendorHost && !onCourierHost && !onAdminHost && pathname.startsWith("/admin")`, redirecting to
`adminUrl("/login?redirect=" + pathname)`. It routes through `/login` rather than straight to the
path because cookies are host-only: an admin signed in on the customer host is a *guest* on the
console, and `adminUrl("/admin")` would show him a 404 at the exact moment he asked for his queue.
The sign-in door gives the right result either way — signed in there, it forwards; not signed in,
he signs in once.

**`AdminShell` — and why it had to come first.** No page under `src/app/admin/` had a sign-out of
its own, and `/admin/support` was *already* suppressed in `AppChrome`'s `STANDALONE_PREFIXES`, so
an admin on the support console had **no way out** before this change. The other four pages only
had one because the storefront `Header` happened to wrap them. Suppressing chrome for a whole host
makes that gap universal, so `src/components/admin/AdminShell.tsx` closes it first: a sticky top
bar with the logo, a **five-tab nav** (Admin · Elite · Couriers · Outreach · Support), and a Logout
button.

The layout split is forced and identical in shape to the courier pair: `src/app/admin/layout.tsx`
stays a Server Component so it can export `metadata`, and renders `AdminShell`, the Client
Component that needs `usePathname()` to mark the current tab. Three deliberate differences from
`CourierShell`:

- **It has nav; the courier hub has none.** A courier has one page, the console has five.
- **No `STANDALONE_PATHS`.** `CourierShell` needs one because `/courier/register` renders bare
  under its own layout. Nothing under `/admin` does, so the shell applies uniformly.
- **Sign-out reuses `useAuth().signOut`** rather than copying `CourierShell`'s inline block.
  `AuthProvider` is mounted in the root layout, and that function already does `scope: "local"`
  with a storage purge and a retry — the security-required behaviour, kept in one place.

Its five-tab `isActive` treats `/admin` **exactly** and the other four by prefix, because `/admin`
is a prefix of all four — otherwise the Admin tab would light up on every page.

No link back to the storefront, following the vendor centre's rule 4 rather than the courier's
divergence: the console is a closed host whose every other path redirects away, so `siteUrl("/")`
would be the one way to leak the storefront into an admin tab. The logo points at `/admin`.

**The twin gate.** Requested as a "twin gate" to protect the panel because *"sometimes my IP or
home network can change"* — and that clause is the requirement, because it rules out the obvious
design: **an IP allow-list is precisely the thing that breaks when a network changes.** So this
door is bound to the **device**, not the address. No IP is consulted anywhere.

(The product actually named "Twingate" was researched and is not buildable here. Its *Privileged
Access for Web Apps* fronts **private** in-cluster resources, is documented as **in beta — request
access**, and deploys as a Kubernetes-shaped **Layer 7 reverse proxy** whose `Host`-header
behaviour is undocumented for this case. `isAdminHost()`, `AppChrome`, and every branch in
`middleware.ts` key off `request.headers.get("host")`, so a rewritten Host would switch host
detection off for the whole feature. Doing it for real means renting a VM, moving the DNS record
off Vercel, managing its certificate, and installing the Twingate Client on every device — which
makes the console *harder* to reach when a network changes, the opposite of the request. Twingate
publishes official Next.js middleware guides for verifying its injected JWT, so if GreenPack ever
gets a private network the app-side half is a drop-in; the infrastructure is the blocker, not the
code.)

Two doors, independent of each other:

| Door | Proves | Bound to | Survives an IP change |
|---|---|---|---|
| **A** the door key | this browser was granted access | a long-lived cookie | **yes — that is the point** |
| **B** the identity | this session is an `admin` | the Supabase session cookie | yes |

Door B already exists and is untouched (`hideIfUnauthorized` + `ROLE_REQUIRED["/admin"]`). Door A
is the new mechanism, and it is small: `ADMIN_GATE_COOKIE = "gp_admin_gate"`, an
`httpOnly`/`secure`/`sameSite: "lax"` cookie on `path: "/"` with a 400-day `maxAge` (the browser
ceiling). Its value is an **HMAC of a fixed string keyed on the secret**, never the secret itself —
so a leaked cookie grants access without disclosing the URL that mints it.

Enrolment is one secret URL, visited **once per browser**:
`https://admin.greenpackdelight.com/gate/<secret>`. It sets the cookie and forwards to `/admin`.
There is nothing to redo when a network changes, because the network was never consulted. Rotating
`ADMIN_GATE_SECRET` invalidates every enrolled device at once — that is the revocation story.

Four properties are load-bearing rather than incidental:

1. **An unset `ADMIN_GATE_SECRET` fails CLOSED.** `adminGateValue()` returns `""`, no cookie can
   match, and the host serves 404s and nothing else — including `/login`. That is the safe
   direction, and it is worth stating explicitly because the neighbouring `rateLimit()` in
   `src/lib/rate-limit.ts` deliberately fails **open**. The two must not be assumed to agree.
2. **A wrong secret is indistinguishable from any other ungated path** — the same `/not-found`
   rewrite with a 404 that `hideIfUnauthorized` already returns. A distinct error would confirm the
   URL exists and turn the secret into something guessable by oracle.
3. **The gate sits before the closed-host block**, so an ungated visitor learns nothing about the
   host's shape — not even which paths redirect where. Every branch returns through
   `withAuthCookies()` like every other branch in the file; the gate cookie is set *after* that
   call so the two never contend for the same response.
4. **The comparison is constant-time** (`gateSafeEqual`). A plain `===` leaks the secret one byte
   at a time to anyone willing to measure the response.

`ADMIN_GATE_SECRET` is **server-only** — no `NEXT_PUBLIC_` prefix, ever: a `NEXT_PUBLIC_` value is
inlined into the client bundle, which would hand the secret to every visitor. `/_next` stays exempt
or dev breaks, and file requests are exempt mechanically (their last segment contains a dot). The
enrolment path needs no entry in the allow-list: it is handled and returned before the closed-host
block ever runs, and nothing in the app links to it.

**Do not layer a Vercel `deny` IP allow-list on top of this.** A WAF `deny` fires at the edge
*before* the app runs, so it would block `/gate/<secret>` itself and lock you out of the very
mechanism that frees you from IP — the exact failure the gate exists to remove. A `log`-only rule is
fine and useful; a blocking one is not. (Vercel WAF Custom Rules exist on every plan, and **Hobby
caps this project at 3 total**. The neighbouring options are all wrong here: Trusted IPs are
Enterprise-only — that *is* the proper allow-list tool, and it is not on this plan; Password
Protection is Pro at $20/mo/project; Vercel Authentication is project-scoped and would gate the
public storefront too.)

Env: `NEXT_PUBLIC_VENDOR_URL`, `NEXT_PUBLIC_COURIER_URL`, `NEXT_PUBLIC_ADMIN_URL`, and
`NEXT_PUBLIC_SITE_URL` (all optional in production — the defaults in `hosts.ts` are the real
domains). Locally set them to `http://vendor.localhost:3000`, `http://courier.localhost:3000`,
`http://admin.localhost:3000`, and `http://localhost:3000`; `vendor.localhost`,
`courier.localhost`, and `admin.localhost` are also listed in `allowedDevOrigins` in
`next.config.ts` (a missing entry there shows up as unstyled headings or half-loaded pages in dev,
because Next.js blocks the cross-origin dev CSS/HMR requests).

**Supabase Redirect URLs — all eight, and they are not interchangeable:**

```
http://localhost:3000/**                 ← customer lane, local
http://vendor.localhost:3000/**          ← vendor lane, local
http://courier.localhost:3000/**         ← courier hub, local
http://admin.localhost:3000/**           ← admin console, local
https://greenpackdelight.com/**          ← customer lane, production
https://vendor.greenpackdelight.com/**   ← vendor lane, production
https://courier.greenpackdelight.com/**  ← courier hub, production
https://admin.greenpackdelight.com/**    ← admin console, production
```

Supabase matches the **full origin**, so `localhost` does not cover `vendor.localhost`,
`courier.localhost`, or `admin.localhost` — they are different hosts, and a wildcard on one does not
cover the others. Each missing entry costs one host in one environment.

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

**Elite-first ordering.** `dbGetShops()` chains `.order("is_elite", { ascending: false })`
*first*, ahead of the requested `rating` / `created_at` sort — so an admin-approved Elite shop
leads every listing while each tier keeps the order the visitor asked for. PostgREST applies
chained `.order()` calls in sequence, which is the multi-key sort this needs.
`filterShops()` in `src/lib/utils.ts` is the **mock path's half of the same rule** and must agree
with it, or behaviour diverges the moment `NEXT_PUBLIC_SUPABASE_URL` is unset: it applies the same
elite-first sort *after* its `sortBy` switch, relying on `Array.prototype.sort` being stable
(ES2019) so the inner order survives within a tier. Sorting elite *before* the switch instead would
let elite win only ties — a 4.9 non-elite would still jump a 3.0 elite.

With **zero** approved elite shops both paths collapse to exactly the previous single-key
ordering, which is what makes the change regression-free. `is_elite` is additionally honoured by
`dbGetShops({ elite: true })` as a *filter* — a filter and an ordering are different jobs, and both
are wanted.

**The image display rule.** A shop is **displayable only with a thumbnail, a banner, and at least
one gallery image**. It is a *display* rule — applied where shops are **listed**, never at identity
lookup — so a shop can be saved, editable, and real while being invisible to customers. That gap is
deliberate and the UI is required to say so rather than let a vendor assume the save failed.

One rule, three runtimes, and they must agree:

| Layer | Where | What it is |
|---|---|---|
| SQL | `shops.images_complete` — the generated column in migration 021 | What the Supabase path filters on |
| JS | `shopImagesComplete()` in `src/lib/utils.ts` | The predicate itself, and the mock path's half |
| UI | the shop editor and the seller dashboard | Reports the verdict; never computes its own |

`dbGetShops()` and `GET /api/shops` apply `.eq("images_complete", true)`; `filterShops()`,
`searchShops()`, `getShopsByCategory()`, and `getFeaturedShops()` apply the predicate in JS. The
JS half is not redundant with SQL for the same reason the elite-first sort is not: it is the mock
path's implementation, and the two must agree or behaviour diverges the moment
`NEXT_PUBLIC_SUPABASE_URL` is unset.

Four properties are load-bearing rather than incidental:

1. **The filter runs before the pagination cut, not after it.** `GET /api/shops` chains
   `.eq("images_complete", true)` **ahead of** `.range(offset, offset + limit - 1)`. Filtering
   after the cut returns a short page while displayable shops sit just past the boundary — a bug
   that looks like missing data rather than a misplaced filter.
2. **The predicate counts array *length*, not non-blank entries.** `gallery.length >= 1` —
   deliberately, so the generated column can mirror it with `jsonb_array_length`. Making the TS
   stricter than the SQL would break the pair. The **editor's save filters blanks** before sending,
   so the editor must feed the predicate the *sanitized* array (`savedGalleryUrls` in
   `src/app/seller/shop/page.tsx`) — fed the raw form, a single empty row reads as `[""]`, which
   the predicate calls present and the save stores as nothing, and the editor shows "you are
   listed" for a shop that is not.
3. **`getShopById` is deliberately unfiltered.** Identity lookup answers "what is shop X", and the
   vendor fixing an incomplete shop needs to read back what they saved. Note the consequence: an
   incomplete shop **is still reachable at `/shop/[shopId]` by anyone holding the URL** — that page
   checks only `if (!shop) notFound()`. It is unlisted in the sense that decides *discovery*
   (browse, search, category, homepage), not in the sense of being unreachable. Gating it needs an
   owner check on that page; the owner is already available as `shop.owner` (`mapShop` maps it from
   `owner_id`), so that is a small change rather than a refactor. This is current behaviour, not an
   endorsement.
4. **`images_complete` is generated, so it is never written.** It is derived by Postgres from
   `images`; a client that sends it gets an error, which is the correct outcome.

**The rule's admin-side half — image outreach.** `/admin/outreach` exists because this rule hides a
shop from customers while the vendor is only told on pages they may never open again: 91 of 95
production shops were saved, real, and invisible. The panel reads **this same column** —
`.eq("images_complete", false)` — so **SQL decides who gets emailed**, and the page never
re-derives the list in JavaScript. The helper that describes *which pieces* are missing feeds the
email copy only; it mirrors `shopImagesComplete()` piece for piece (including property 2's
array-length quirk), and if it ever disagrees and comes out empty, the copy falls back to the
generic three-item checklist rather than changing who receives mail. Two further properties are
load-bearing:

- **It sends to `profiles.email`** — never `shops.contact.email`, and never `auth.users.email`. The
  last of those is a split vendor's *internal* address
  (`v.<uuid>@vendors.greenpackdelight.com`, see **Vendor Accounts**), so mailing it reaches nobody.
- **The test send has no `testTo` parameter, by design.** The sample goes to the calling admin's own
  address, resolved server-side from the session; an arbitrary recipient would turn an admin
  endpoint into an open relay.

Sends are recorded in `shop_image_outreach` (migration 022) — **on success only**, so a failed
delivery leaves no row and the panel offers it again.

**Migration 021 must be applied before this ships.** `dbGetShops()` returns `[]` on any query
error, so a missing `images_complete` column does not fail loudly — it silently empties every
listing on the site. **Migration 022 must be applied before `/admin/outreach` is deployed**, for
the same class of reason: the panel's GET reads that table, and a missing one renders as an empty
queue — which reads as "no unlisted shops" rather than as a fault.

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

### AI Shop Images — **dormant** (`/api/seller/shop/image`)
**There is no in-app image generator in the UI.** The route below is complete and correct but
**nothing calls it**; the vendor-facing half is now `src/components/ui/MakeImageWithGoogle.tsx`,
which is Google's two image generators and nothing else.

It was removed on 2026-10-09 because it cannot succeed at a $0 provider balance, not because it
was broken: `imageConfig()` checks *configuration*, never the account balance, so a key that is
present but unfunded passes and the button appears — then the first real generation returns `402`.
Verified that day: OpenRouter lists `inclusionai/ming-image-0.1-design` at `0` on every pricing
field, but it carries **no `:free` suffix**, and a non-`:free` endpoint requires a funded account
whatever it lists — a live call on a $0 account returns `402 "Insufficient credits. This account
never purchased credits."` Only **two** of the 61 image models OpenRouter lists are all-zero-priced,
both in that one model's family, so there is no free image tier there to fall back to.

**The route is kept, not deleted.** The request was to remove the vendor-facing *option*, not the
capability, and restoring it is a client-side re-mount with no server work. Its header carries the
same warning. Note that Google is **not** a drop-in replacement: Gemini is
`POST /v1beta/models/{model}:generateContent` → `candidates[0].content.parts[].inlineData.data`,
where this route speaks OpenRouter's `POST {baseUrl}/images` → `data[0].b64_json`. Repointing
`SHOP_IMAGE_AI_BASE_URL` at Google would be a **code change, not an env change**. Google has no free
programmatic image tier either — `gemini-2.5-flash-image` is not on the free tier, and image
generation left it in December 2025.

Should it be restored, `GET` returns capability + quota (`{ available, used, limit }`); `POST` takes
`{ description }` (trimmed, 1–300 chars) and returns `{ url }`. Four properties make it safe to ship:

1. **Availability is the server's answer, not the client's assumption.** With
   `SHOP_IMAGE_AI_API_KEY` or `SHOP_IMAGE_AI_MODEL` unset, `GET` answers `available: false` and the
   Generate button is simply **absent** — never present-and-failing, never a button that 503s the
   moment a vendor has typed a description. `SHOP_IMAGE_AI_MODEL` deliberately has **no default**:
   a wrong guess at a text model id is harmless, a wrong guess at an image model id either 400s or
   silently bills at a rate nobody chose.

   Availability is checked against **configuration, not against the provider account** — which is
   precisely the gap that made the feature unusable in practice and got it pulled. That is why the
   route gives the provider's account-level statuses (401/402/403) their **own** copy instead of the
   generic branch: `402` means our credit balance, and answering it with "try describing it
   differently" is advice the vendor could follow forever without ever succeeding. The daily cap is
   what makes the feature affordable, not a nicety.
2. **The cap is durable, never client state.** `shop_image_generations` (migration 020) is the
   ledger; `POST` counts the caller's rows in the last 24h and returns `429` *before* the paid call.
   `SHOP_IMAGE_AI_DAILY_LIMIT` defaults to 5. Unlike the support assistant's `:free` text model,
   **there is no free image tier**, so a cap is load-bearing. Exposure is bounded by
   vendors × cap × price-per-image, not by traffic: the cost lands only when a vendor chooses to
   generate.
3. **The provider's output is untrusted.** The returned bytes get the *identical* magic-byte
   validation an uploaded file gets, via the shared `src/lib/image-bytes.ts` — the declared
   `media_type` is ignored for the same reason a client-declared MIME is. A non-image, a truncated
   payload, or a disguised HTML/SVG document is rejected before it can reach Storage.
4. **The Google links are always rendered, in every state — and styled as buttons, identically.**
   `MakeImageWithGoogle` shows both free routes (`https://gemini.google.com/app` and
   `https://labs.google/fx/tools/flow`) side by side, with a "Show the steps" walkthrough one click
   away. Both carry the **same** `ROUTE_BUTTON` fill — one shared constant, not two literals —
   because Flow is not the lesser option: it is the only route in the countries where Gemini's
   image tools are not offered, and an outlined Flow read as the fallback. Both are visible at once
   rather than one behind the disclosure: with no in-app generator left, collapsing either would
   hide half the feature. The labels stay **Gemini** and **Flow**; Google makes both products, so
   calling either one "Google" would name the pair rather than the route.

   Three details here are load-bearing rather than cosmetic. The links are **styled as controls, not
   as grey body text** — the original was `text-gray-500` with no underline, read as a caption, and
   vendors did not realise it was clickable. The steps panel is **collapsed by default** because this
   component renders three times on the shop editor (thumbnail, banner, gallery) and seven open steps
   each time would bury the form. And the secondary route is Google **Flow**, not ImageFX: Google
   retired standalone ImageFX into Flow, so the old `labs.google/fx/tools/image-fx` URL redirected
   into Flow while the label still promised "ImageFX" — a vendor who clicked it landed somewhere
   the copy had not described. Flow's real image flow (documented at
   `https://labs.google/fx/tools/flow`) puts the image/video switch behind the **model-name button
   inside the prompt box**, and it defaults to *video*; that is the step everyone misses, so the
   copy spells it out. Gemini's route needs the prompt to open with "Create an image of…", because
   asked plainly it replies with text instead of a picture.

Provider note: OpenRouter's image API is **`POST {baseUrl}/images`**, *not* `/images/generations`,
and it returns base64 inline (`data[0].b64_json`) with **no `url` field at all**. There is therefore
no remote image URL for the server to fetch, which is also why no server-side URL-fetch path exists.
Both uploaders (`ImageUpload`, `ImageGalleryUpload`) render `MakeImageWithGoogle` as a **shared child**
rather than one wrapping the other — they do not share an upload path (the gallery has its own
`fetch("/api/upload")`), and the gallery's multi-image grid and ordering controls make a merge
larger and riskier than the shared child. Each parent decides where its own image goes; the helper
reports **nothing** back, because the vendor downloads the picture and uploads it through the parent
exactly as if they had taken it themselves.

### OTP Verification
`verification_otps` table stores 6-digit codes (email/phone), TTL 10 min, auto-cleaned via DB trigger. API route `/api/verify` handles validation. `OTPInput` and `PasswordStrength` components live in `src/components/auth/`.

### Server vs Client Components
Server Components by default. Only add `"use client"` when the component needs:
- React hooks (useState, useEffect, useContext)
- Event handlers (onClick, onChange)
- Browser APIs

**Client components**: CartContext, SearchBar, MobileNav, FilterBar, VideoShowcase, ProductCard, ServiceCard, CartItem, CartItemList, CartSummary, ThemeToggle, FAQAccordion, CategoryCard, CourierShell, AdminShell, ImageUpload, ImageGalleryUpload, MakeImageWithGoogle, cart/page, checkout/page, help/page, wishlist/page, profile/page, login/page, register/page, signup/page, vendor/dashboard/page, courier/dashboard/page

### State Management
- **Cart**: `src/context/CartContext.tsx` — React Context + `useReducer`
  - Actions: `ADD_ITEM`, `REMOVE_ITEM`, `UPDATE_QUANTITY`, `UPDATE_NOTES`, `CLEAR_CART`
  - Access via `useCart()` hook from `src/hooks/useCart.ts`
- **Theme**: Managed by `next-themes` ThemeProvider in `src/components/providers/ThemeProvider.tsx`
- **Auth**: Supabase session (SSR cookie-based, persisted across server/client)
- **Search/Filter**: URL search params (`searchParams`) on browse page — no client state

### Category Reveal (CSS-only, never `useState`)
Subcategories reveal on hover/focus through Tailwind **named groups** — `group/row` +
`group-hover/row:` + `group-focus-within/row:` — not through React state. This is a property to
preserve, not a style preference: it keeps `CategorySidebar` and its `CategoryRail` export Server
Components, and ships no JS to decide the reveal. `group-focus-within/row:` is what gives keyboard
users the same reveal.

**Panels never open except under a pointer or focus.** Nothing derives an open group from the URL:
the sidebar reads `activeCategory` / `activeGroup` only to mark the *current* row and tile, and the
scope props do not open anything. A bare `/browse` shows the group rail and nothing else — as does
every other `/browse` state, including a leaf view. `CategoryRail` is hover-only for the same
reason, so the homepage and `/browse` behave identically.

**No space is reserved for a panel, on either surface.** Panels are `absolute left-full` with an
explicit `w-[19rem]`, so they overlay whatever sits beside the rail — the homepage's shop sections,
`/browse`'s own grid — and the sidebar column is sized by the rail alone (13.5rem). This is worth
stating because the previous arrangement had that space held open: the panels were sized
`left-48 right-0` into a column reserved by `w-[32rem]` on the `/browse` flex item, and the column
was load-bearing *only* because the space existed to be painted into. At rest it was a bordered
empty box beside a 192px rail, which is what the user reported. Two consequences are easy to
re-break: `/browse`'s sidebar wrapper must not carry `overflow-y-auto` (any `overflow` other than
`visible` on one axis computes the other to `auto`, which would clip the panel that now overflows
it), and the panel's `left-full` needs its `w-48` nav to stay fixed, since that nav is what sizes
the aside, the column, and the panel's origin all at once. Both panels keep `shadow-lg` for the
same reason: they lift off real content that is merely underneath, not off the box they sat in.

**`CategoryRail` is `absolute`, not `fixed`** — and that is a correctness property, not taste.
`fixed` pinned it to the viewport, so it stayed over the left edge of every section that scrolled
under it and covered real text. Absolute, it belongs to the page: it occupies the top-left corner
on arrival and scrolls away with the hero. The homepage root div carries `relative` for this, which
is load-bearing in the other direction — without a positioned ancestor the rail would resolve
against the document and `top-8` would park it behind the 80px sticky header. Everything else about
the arrangement is unchanged: `top-8` reproduces the on-screen 112px the old `fixed top-28`
resolved to, and `z-40` still keeps it under the header (`z-50`) and over `HeroSection` (`z-20`).

That is a deliberate departure from what this section used to describe. The sidebar formerly
resolved an `openGroup` with two clauses — an explicit `?group=`, else the group owning the active
leaf — and rendered that panel `block` at rest, so `/browse?category=plumber` painted a panel the
visitor had not asked for. Both clauses are gone. **Do not reintroduce one to "restore" deep-link
targeting:** the reveal is a pointer affordance, and a deep link's job is to select the *listing*,
which the row and tile highlighting still shows.

Below `lg` — where `:hover` cannot exist — the equivalent is a native `<details>`, closed at rest:
`FilterBar`'s pill row (all 45 leaves) and `MobileNav`'s drawer. Same "closed until asked", still no
state. At `lg`+ on touch there is now **no reveal at all**: `:hover` does not exist and no URL opens
a panel, so a rail row's tap navigates to that group's listing with every panel shut. Leaf
navigation on such a device goes through `FilterBar`'s `<details>` row (`lg:hidden`, so reachable by
narrowing the window) or by typing `?category=`. Adding a touch affordance back would need an
explicit opt-in — a `@media (hover: hover)` gate is not available, since `tailwind.config.ts` sets
no `future.hoverOnlyWhenSupported`.

### Path Alias
`@/*` maps to `./src/*` (configured in `tsconfig.json`)

## Database Schema (Supabase)

### Tables
| Table | Description |
|-------|-------------|
| `profiles` | Extends `auth.users` — role, full_name, phone, avatar_url, DOB, email/phone_verified, terms_accepted, **`email`** (the address the user typed; may repeat across a customer and a vendor row) |
| `shops` | Vendor shop listings — owner_id, slug, category, location (JSONB), contact (JSONB), images (JSONB), video (JSONB), tags, is_verified, is_featured, **`is_elite`** (set by admin review only, never from a vendor request — see `trg_guard_shop_elite`) |
| `services` | Shop services — price, price_type (fixed/from/hourly), duration, is_available |
| `products` | Shop products — price, original_price, image, in_stock, quantity |
| `reviews` | Customer reviews — rating, comment, customer_name/avatar |
| `orders` | Customer orders |
| `deliveries` | Courier delivery jobs |
| `verification_otps` | 6-digit OTP codes — identifier (email/phone), type, expires_at, used |
| `support_tickets` | Customer support tickets (queued/assigned/resolved) |
| `support_messages` | Support chat messages linked to tickets |
| `shop_image_generations` | AI shop-image usage ledger — owner_id, shop_id (nullable, `ON DELETE SET NULL`), model, cost_usd, created_at. Indexed on `(owner_id, created_at desc)`, which is exactly the cap query. RLS is owner `SELECT` only: every write goes through `createAdminClient()`, so an INSERT policy would be unused config *and* a standing channel to forge usage rows, and a DELETE policy would let a vendor reset their own daily cap |
| `shop_image_outreach` | Vendor image-outreach send ledger — shop_id (`ON DELETE CASCADE`), owner_id and sent_by (both `SET NULL`), **`to_email`** (denormalised on purpose: the address can change, and a bounced send must stay attributable to the address that received it), sent_at. Indexed on `(shop_id, sent_at desc)` — the panel's only read is "the latest send per shop". RLS is enabled with **no policies at all**, a different shape from `shop_image_generations` above: nothing vendor-facing reads this table, so a `SELECT` policy would have no caller, and an INSERT policy would be unused config *and* a standing channel to forge "already emailed" rows — which is exactly the state that makes the panel skip a vendor who was never contacted. Every write goes through `createAdminClient()`. One row per email *actually sent*: a failed send leaves no row, so the panel offers it again. There is deliberately **no `is_test` column** — the test send writes nothing, because it is not outreach |

### Triggers
- `on_auth_user_created` → auto-creates `profiles` row on signup with role from `raw_user_meta_data`, and `email` from `contact_email` (the split vendor's real address) falling back to `new.email`
- `trg_guard_profile_role` → blocks role changes except by an admin or the service role
- `trg_cleanup_otps` → deletes expired OTPs (>1hr) on each insert
- `trg_guard_shop_elite` → blocks client writes to `shops.is_elite`, `is_verified`, and `is_featured`; only an admin or the service role may set them (migration 018)

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
SUPPORT_AI_API_KEY=                # Support assistant model key (server-only)
SUPPORT_AI_PROVIDER=               # "openrouter" (default) | "openai"
SUPPORT_AI_MODEL=                  # Defaults per provider — openrouter: meta-llama/llama-3.1-8b-instruct:free
SUPPORT_AI_BASE_URL=               # Defaults per provider (openrouter.ai/api/v1)
SUPPORT_AI_APP_URL=                # Attribution header for the provider
SUPPORT_AI_APP_NAME=               # Attribution header for the provider
SHOP_IMAGE_AI_API_KEY=             # AI shop-image key (server-only). DORMANT — see AI Shop Images
SHOP_IMAGE_AI_MODEL=               # No default, deliberately — an unset model means no generation, no spend
SHOP_IMAGE_AI_BASE_URL=            # Defaults to https://openrouter.ai/api/v1
SHOP_IMAGE_AI_DAILY_LIMIT=         # Per-vendor images per 24h (default 5). The cap is what bounds cost
NEXT_PUBLIC_SITE_URL=              # Customer-site origin (optional; hosts.ts defaults to the real domain)
NEXT_PUBLIC_VENDOR_URL=            # Vendor-center origin (optional; defaults to vendor.greenpackdelight.com)
NEXT_PUBLIC_COURIER_URL=           # Courier-hub origin (optional; defaults to courier.greenpackdelight.com)
NEXT_PUBLIC_ADMIN_URL=             # Admin-console origin (optional; defaults to admin.greenpackdelight.com)
ADMIN_GATE_SECRET=                 # The admin console's door key — server-only, NEVER prefix with
                                   # NEXT_PUBLIC_ (that inlines it into the client bundle). Unset, the
                                   # console serves 404s and nothing else: it fails CLOSED, deliberately
                                   # the opposite of rateLimit() in src/lib/rate-limit.ts. Rotating it
                                   # revokes every enrolled device at once. See **The twin gate**.
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
| `src/lib/hosts.ts` | Multi-host helpers — `isVendorHost()`, `isCourierHost()`, `isAdminHost()`, `vendorUrl()`, `courierUrl()`, `adminUrl()`, `siteUrl()` |
| `src/types/index.ts` | All TypeScript interfaces |
| `src/context/CartContext.tsx` | Cart state provider |
| `src/hooks/useCart.ts` | Cart hook |
| `src/middleware.ts` | Auth + role-based route protection + the closed vendor, courier, and admin hosts + the admin gate |
| `src/components/layout/AppChrome.tsx` | Suppresses storefront Header/Footer on the closed hosts and standalone routes |
| `src/components/courier/CourierShell.tsx` | The courier hub's own top bar + Logout (its layout must stay a Server Component to export `metadata`) |
| `src/components/admin/AdminShell.tsx` | The admin console's own top bar, its five-page nav, and a sign-out — which no `/admin/*` page had before, because the storefront Header used to supply it. Its layout is split the same way `courier/layout.tsx` is, and for the same reason |
| `src/app/globals.css` | Global styles, dark mode body, scrollbar |
| `tailwind.config.ts` | Theme colors, dark mode config, animations |
| `supabase/migrations/001_initial_schema.sql` | Core DB schema |
| `supabase/migrations/002_verification_and_profile_update.sql` | OTP + profile fields |
| `supabase/migrations/017_vendor_accounts.sql` | `profiles.email` + vendor-only uniqueness + trigger email |
| `supabase/migrations/018_elite_vendors.sql` | `shops.is_elite` + `elite_applications` + the elite guard trigger |
| `supabase/migrations/019_backfill_shop_category_ids.sql` | slug→id repair for seeded `category_id` (no-op against production) |
| `supabase/migrations/020_shop_image_generations.sql` | AI shop-image usage ledger — owner `SELECT` only; the daily cap's numerator |
| `supabase/migrations/021_shop_images_complete.sql` | `shops.images_complete` generated column — the display rule's SQL half. **Apply before shipping** |
| `supabase/migrations/022_shop_image_outreach.sql` | Image-outreach send ledger — RLS enabled with no policies; one row per email actually sent. **Apply before deploying `/admin/outreach`** |

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
