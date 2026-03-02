---
name: feature-builder
description: Use when someone asks to add a feature, build something new, implement functionality, or extend the GreenPack app. Examples: "add a wishlist", "build seller dashboard", "implement search history", "create a new page".
argument-hint: [feature description]
---

## What This Skill Does

Plans and implements new features for the GreenPack project end-to-end. Gathers requirements, explores existing code for reusable patterns, creates a plan, implements the feature following all project conventions, updates project documentation, and verifies the build passes.

If `$ARGUMENTS` is provided, use it as the initial feature description and skip straight to clarifying questions.

---

## Step 1: Gather Requirements

Before writing any code, ask clarifying questions using `AskUserQuestion`. Adapt questions to the feature, but always cover:

- **Scope**: What exactly should this feature do? What pages/routes are involved?
- **User flow**: How does the user interact with it? What triggers it? What's the expected outcome?
- **Data**: Does it need new mock data? New types? New query functions?
- **Components**: Should it reuse existing components or need new ones?
- **Edge cases**: What happens with empty states, errors, or missing data?

Keep it to 1-2 rounds of questions. Don't over-ask — use judgment to fill in obvious details.

---

## Step 2: Explore Existing Code

Use the Task tool with `subagent_type=Explore` to scan the codebase for:

1. **Reusable components** in `src/components/` — check if similar UI already exists
2. **Existing utilities** in `src/lib/utils.ts` — check for query functions, formatters, helpers
3. **Related types** in `src/types/index.ts` — check for existing interfaces to extend
4. **Similar pages** in `src/app/` — find pages with similar patterns to follow
5. **Mock data structure** in `src/lib/data/` — understand the data shape conventions

Key files to always check:
- `src/types/index.ts` — all TypeScript interfaces
- `src/lib/utils.ts` — utility/query functions + `BLUR_PLACEHOLDER`
- `src/lib/constants.ts` — site name, currency symbol, config
- `src/context/CartContext.tsx` — if feature involves cart interactions
- `src/app/layout.tsx` — root layout structure

---

## Step 3: Plan

Produce a step-by-step implementation plan. List every file to be created or modified.

**If the plan touches 5 or more files**, present the plan to the user and ask for approval before proceeding. Use `AskUserQuestion` with the plan summary and options to approve, modify, or reject.

**If the plan touches fewer than 5 files**, proceed directly to implementation.

The plan should specify:
- New files to create (with their paths)
- Existing files to modify (with what changes)
- The order of implementation (types first, then data, then components, then pages)

---

## Step 4: Implement

Create and modify files following these GreenPack conventions strictly:

### Server vs Client Components
- **Server components by default**. No directive needed.
- Add `"use client"` ONLY when the component needs: React hooks, event handlers, browser APIs, or context.
- Client components in this project: anything using `useCart()`, `useState`, `useEffect`, `onClick`, `onChange`, animations with Framer Motion hooks.

### File Organization
- Components go in `src/components/[feature-area]/` (e.g., `browse/`, `shop/`, `cart/`)
- Pages go in `src/app/[route]/page.tsx`
- Loading states go in `src/app/[route]/loading.tsx`
- Types go in `src/types/index.ts`
- Mock data goes in `src/lib/data/[name].ts`
- Query functions go in `src/lib/utils.ts`

### Naming
- Components: PascalCase (`ShopCard.tsx`, `FilterBar.tsx`)
- Files: PascalCase for components, camelCase for utilities and hooks
- IDs in mock data: kebab-case with prefix (`shop-1`, `svc-1`, `prod-1`)

### Imports
- Always use the `@/` path alias (maps to `./src/*`)
- Example: `import { Shop } from "@/types"`

### Styling
- Use Tailwind CSS classes — no inline styles, no CSS modules
- Use `cn()` from `@/lib/utils` for conditional class merging
- Mobile-first responsive: base (mobile) → `md:` (tablet) → `lg:` (desktop)
- Apply dark mode variants on every visual element:

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

### Images
- Use `next/image` with `unoptimized` for external/placeholder URLs
- Always add `placeholder="blur"` and `blurDataURL={BLUR_PLACEHOLDER}`
- Import `BLUR_PLACEHOLDER` from `@/lib/utils`

### Animations
- Use Framer Motion for interactive elements
- `whileHover` and `whileTap` on buttons and cards
- `AnimatePresence` for enter/exit transitions
- Import `motion` from `framer-motion`

### Data Layer
- Mock data arrays in `src/lib/data/` — export typed arrays (e.g., `export const items: Item[] = [...]`)
- Query functions in `src/lib/utils.ts` — follow existing pattern: `getXByY()`, `filterX()`
- All prices in Nigerian Naira (NGN) — use `formatPrice()` from utils, never format manually
- Currency symbol is `₦`

### Types
- Define all new interfaces in `src/types/index.ts`
- Export all interfaces
- Follow existing patterns for field naming and structure

### State & Feedback
- Cart interactions via `useCart()` hook from `@/hooks/useCart`
- Toast notifications via `toast` from `sonner` for user feedback (add to cart, errors, success)
- URL search params for filtering/search state on server pages — no client state for filters

### Implementation Order
Always implement in this order:
1. Types (interfaces in `src/types/index.ts`)
2. Mock data (new files in `src/lib/data/` or extend existing)
3. Query/utility functions (in `src/lib/utils.ts`)
4. Components (in `src/components/[feature]/`)
5. Pages (in `src/app/[route]/`)
6. Loading states (in `src/app/[route]/loading.tsx`)

---

## Step 5: Update CLAUDE.md

After implementation, update `CLAUDE.md` to document what was added:

- New routes: add to the **Routes** table
- New components: add to the **Project Structure** tree
- New data files: add to the data section
- New types: mention in the Types section
- New client components: add to the client components list

Only update sections that are affected. Don't rewrite unrelated parts.

---

## Step 6: Verify

Run the following commands and fix any errors before finishing:

```bash
npm run build
npm run lint
```

If errors occur, fix them. Repeat until both commands pass cleanly. Report the final status to the user.

---

## Guardrails

- **Reuse first**: Always check for existing components, utilities, and patterns before creating new ones. Don't reinvent the wheel.
- **No new dependencies**: Do not install new npm packages without explicitly asking the user for approval.
- **Ask before large changes**: If the implementation plan touches 5 or more files, present the plan and get approval.
- **No over-engineering**: Only build what's requested. Don't add extra features, unnecessary abstractions, or speculative code.
- **Security**: Don't introduce XSS, injection, or other vulnerabilities. Sanitize user inputs at boundaries.
- **No breaking changes**: Don't modify existing component APIs or data structures in ways that break other pages.
