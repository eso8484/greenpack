# GreenPack

## Overview
GreenPack (brand: **Green Pack Delight**) is a Nigerian service and shop discovery platform. Vendors list businesses with video showcases, products, and services (laundry, barbershop, phone repair, fashion, food, etc.). Customers browse, discover, and connect with providers via phone, WhatsApp, or inquiry form.

**No backend** — all data is mock data from TypeScript files. Cart state is in-memory via React Context.

## Tech Stack
- **Next.js 16.1.6** — App Router, TypeScript, Turbopack
- **React 19**
- **Tailwind CSS v3** — class-based dark mode (`darkMode: "class"`)
- **Framer Motion** — animations (`whileHover`, `whileTap`, `AnimatePresence`)
- **Sonner** — toast notifications
- **next-themes** — dark mode toggle (ThemeProvider wraps app)
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
│   ├── layout.tsx                # Root: ThemeProvider > CartProvider > Header + Footer + Toaster
│   ├── page.tsx                  # Homepage
│   ├── globals.css               # Tailwind + dark mode body/scrollbar
│   ├── not-found.tsx             # 404 page
│   ├── browse/page.tsx           # Browse/listings
│   ├── shop/[shopId]/page.tsx    # Shop detail (generateStaticParams)
│   ├── cart/page.tsx             # Cart
│   └── checkout/page.tsx         # Checkout
├── components/
│   ├── ui/         # Button, Card, Badge, Rating, PriceTag, Input, EmptyState, Skeleton
│   ├── layout/     # Header, Footer, MobileNav, SearchBar, ThemeToggle
│   ├── home/       # HeroSection, CategoryNav, FeaturedShops, HowItWorks
│   ├── browse/     # CategorySidebar, ShopCard, ShopGrid, FilterBar
│   ├── shop/       # ShopHeader, VideoShowcase, ServiceList, ServiceCard,
│   │               # ProductGrid, ProductCard, ShopContactInfo, ReviewSection, ReviewCard
│   ├── cart/       # CartItem, CartItemList, CartSummary
│   └── checkout/   # ContactForm, OrderReview, CheckoutSummary
├── lib/
│   ├── data/       # shops.ts, categories.ts, services.ts, products.ts, reviews.ts
│   ├── utils.ts    # formatPrice, filterShops, cn(), BLUR_PLACEHOLDER, etc.
│   └── constants.ts # SITE_NAME, CURRENCY, CURRENCY_SYMBOL
├── hooks/          # useCart.ts, useSearch.ts
├── context/        # CartContext.tsx (useReducer: ADD, REMOVE, UPDATE, CLEAR)
└── types/          # index.ts (Shop, Service, Product, Review, CartItem, etc.)
```

## Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Server | Homepage — hero, categories, featured shops, how it works |
| `/browse` | Server | Browse shops — supports `?category=X&q=Y&sort=Z&verified=true` |
| `/shop/[shopId]` | Server | Shop detail — video, services, products, reviews, contact info |
| `/cart` | Client | Cart management — grouped by shop, quantity controls |
| `/checkout` | Client | Contact form + order review, success state clears cart |

## Architecture Patterns

### Server vs Client Components
Server Components by default. Only add `"use client"` when the component needs:
- React hooks (useState, useEffect, useContext)
- Event handlers (onClick, onChange)
- Browser APIs

**Client components**: CartContext, SearchBar, MobileNav, FilterBar, VideoShowcase, ProductCard, ServiceCard, CartItem, CartItemList, CartSummary, ThemeToggle, AnimatedContainer, cart/page, checkout/page

### State Management
- **Cart**: `src/context/CartContext.tsx` — React Context + `useReducer`
  - Actions: `ADD_ITEM`, `REMOVE_ITEM`, `UPDATE_QUANTITY`, `UPDATE_NOTES`, `CLEAR_CART`
  - Access via `useCart()` hook from `src/hooks/useCart.ts`
- **Theme**: Managed by `next-themes` ThemeProvider, toggled via `ThemeToggle` component
- **Search/Filter**: URL search params (`searchParams`) on browse page — no client state

### Path Alias
`@/*` maps to `./src/*` (configured in `tsconfig.json`)

### Data Layer
All mock data lives in `src/lib/data/*.ts`. Query functions in `src/lib/utils.ts`:
- `getShopById()`, `getShopsByCategory()`, `getFeaturedShops()`
- `getServicesByShopId()`, `getProductsByShopId()`, `getReviewsByShopId()`
- `filterShops()` — handles query, category, sort, verified filtering
- `searchShops()` — searches name, description, category, tags

### Types
All TypeScript interfaces in `src/types/index.ts`:
- `Category`, `Shop`, `Service`, `Product`, `Review`
- `CartItem`, `CustomerInfo`, `SearchFilters`

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
- Inter font via `next/font/google`
- Framer Motion on interactive elements (Button `whileTap`, Card `whileHover`)

### Image Handling
- Use `next/image` with `unoptimized` for external placeholder URLs (placehold.co)
- Add `placeholder="blur"` and `blurDataURL={BLUR_PLACEHOLDER}` to all images
- `BLUR_PLACEHOLDER` is a green-tinted SVG base64 constant from `src/lib/utils.ts`

## Key Files Reference
| File | Purpose |
|------|---------|
| `src/lib/constants.ts` | Site name, currency symbol, config values |
| `src/lib/utils.ts` | All utility/query functions + BLUR_PLACEHOLDER |
| `src/types/index.ts` | All TypeScript interfaces |
| `src/context/CartContext.tsx` | Cart state provider |
| `src/hooks/useCart.ts` | Cart hook |
| `src/app/globals.css` | Global styles, dark mode body, scrollbar |
| `tailwind.config.ts` | Theme colors, dark mode config, animations |
