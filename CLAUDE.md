# GreenPack

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
│   ├── search/page.tsx             # Search results
│   ├── wishlist/page.tsx           # Saved/wishlisted shops
│   ├── profile/page.tsx            # Customer profile (auth required)
│   ├── login/page.tsx              # Login
│   ├── register/page.tsx           # Register (customer)
│   ├── signup/page.tsx             # Signup (vendor/courier onboarding)
│   ├── sell/page.tsx               # Become a vendor landing
│   ├── become-courier/page.tsx     # Become a courier landing
│   ├── vendor/dashboard/page.tsx   # Vendor dashboard (role: vendor/admin)
│   ├── seller/                     # Seller management pages
│   ├── courier/
│   │   ├── layout.tsx              # Courier layout
│   │   └── dashboard/page.tsx      # Courier dashboard (role: courier/admin)
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
│       └── verify/                 # OTP verification endpoint
├── components/
│   ├── ui/           # Button, Card, Badge, Rating, PriceTag, Input, EmptyState, Skeleton, Toaster
│   ├── layout/       # Header, Footer, MobileNav, SearchBar, ThemeToggle
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
│   ├── utils.ts      # formatPrice, filterShops, cn(), BLUR_PLACEHOLDER, etc.
│   └── constants.ts  # SITE_NAME, CURRENCY, CURRENCY_SYMBOL
├── hooks/            # useCart.ts, useSearch.ts
├── context/          # CartContext.tsx (useReducer: ADD, REMOVE, UPDATE, CLEAR)
├── middleware.ts     # Auth + role-based route protection
└── types/            # index.ts (Shop, Service, Product, Review, CartItem, etc.)

supabase/
└── migrations/
    ├── 001_initial_schema.sql                       # profiles, shops, services, products, orders, reviews, deliveries
    └── 002_verification_and_profile_update.sql      # verification_otps, profile fields (DOB, email/phone_verified, terms)
```

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
| `/login` | Client | — | Supabase Auth login |
| `/register` | Client | — | Customer registration |
| `/signup` | Client | — | Vendor / courier signup onboarding |
| `/sell` | Server | — | Become a vendor landing page |
| `/become-courier` | Server | — | Become a courier landing page |
| `/profile` | Client | ✅ Required | Customer profile management |
| `/vendor/dashboard` | Client | ✅ vendor/admin | Vendor dashboard — orders, revenue, listings |
| `/seller` | Client | ✅ vendor/admin | Seller management pages |
| `/courier/dashboard` | Client | ✅ courier/admin | Courier dashboard — available jobs, delivery tracking |
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

**Client components**: CartContext, SearchBar, MobileNav, FilterBar, VideoShowcase, ProductCard, ServiceCard, CartItem, CartItemList, CartSummary, ThemeToggle, FAQAccordion, CategoryCard, cart/page, checkout/page, help/page, wishlist/page, profile/page, login/page, register/page, signup/page, vendor/dashboard/page, courier/dashboard/page

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
| `profiles` | Extends `auth.users` — role, full_name, phone, avatar_url, DOB, email/phone_verified, terms_accepted |
| `shops` | Vendor shop listings — owner_id, slug, category, location (JSONB), contact (JSONB), images (JSONB), video (JSONB), tags, is_verified, is_featured |
| `services` | Shop services — price, price_type (fixed/from/hourly), duration, is_available |
| `products` | Shop products — price, original_price, image, in_stock, quantity |
| `reviews` | Customer reviews — rating, comment, customer_name/avatar |
| `orders` | Customer orders |
| `deliveries` | Courier delivery jobs |
| `verification_otps` | 6-digit OTP codes — identifier (email/phone), type, expires_at, used |

### Triggers
- `on_auth_user_created` → auto-creates `profiles` row on signup with role from `raw_user_meta_data`
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
| `src/types/index.ts` | All TypeScript interfaces |
| `src/context/CartContext.tsx` | Cart state provider |
| `src/hooks/useCart.ts` | Cart hook |
| `src/middleware.ts` | Auth + role-based route protection |
| `src/app/globals.css` | Global styles, dark mode body, scrollbar |
| `tailwind.config.ts` | Theme colors, dark mode config, animations |
| `supabase/migrations/001_initial_schema.sql` | Core DB schema |
| `supabase/migrations/002_verification_and_profile_update.sql` | OTP + profile fields |

## Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `/feature-builder` | "add X to GreenPack", "build a new feature", "implement X" | Plans and implements new features end-to-end following all project conventions. Gathers requirements, explores code, plans, implements, updates CLAUDE.md, and verifies the build. |
