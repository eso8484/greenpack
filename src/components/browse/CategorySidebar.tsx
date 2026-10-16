import Link from "next/link";
import { categoriesInGroup, categoryGroups } from "@/lib/data/categories";
import { cn } from "@/lib/utils";
import type { CategoryGroup } from "@/types";

interface CategorySidebarProps {
  activeCategory?: string;
  activeGroup?: string;
}

// Rail rows — "All Categories" plus one per group.
const ROW = "flex items-center gap-2 px-2.5 py-2 text-sm rounded-xl transition-colors";
const ROW_ACTIVE = "bg-green-500/10 text-green-700 dark:text-green-300 font-bold";
const ROW_IDLE =
  "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60";
// Layered on `ROW_IDLE` only, never on an active row: its tint is the stronger
// signal and must not be greyed over. `group-hover/row:` fires whenever the
// pointer is anywhere inside the row's wrapper — which includes the panel, now
// that the panel is positioned inside it rather than out in a separate column —
// so the row stays lit while the pointer crosses to a tile. (`ROW_OPEN`, the
// third treatment for a row whose panel the URL had opened, is gone with the
// URL-derived opener: a row is either the current one or not.) `cn()` is
// twMerge and keeps this alongside `ROW_IDLE`'s own `hover:` variant: different
// modifier prefixes are different groups, not a conflict.
const ROW_LIT = "group-hover/row:bg-gray-100 dark:group-hover/row:bg-gray-700/60";
const ICON =
  "flex items-center justify-center w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-800/20 text-base";

// Panel tiles — icon over a centred 2–3 line name. The icon background is
// chosen in a branch rather than merged: `cn()` is twMerge, which treats
// `bg-gradient-to-br` (background-image) and `bg-green-500` (background-color)
// as different groups, so passing both would keep both and let the gradient
// paint over the green.
const TILE = "flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors";
const TILE_ACTIVE = "bg-green-500/10";
const TILE_IDLE = "hover:bg-gray-100 dark:hover:bg-gray-700/60";
const TILE_ICON = "flex items-center justify-center w-9 h-9 rounded-xl text-lg transition-colors";
const TILE_ICON_ACTIVE = "bg-green-500 text-white";
const TILE_ICON_IDLE =
  "bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-800/20";
const TILE_LABEL = "text-[11px] font-semibold leading-tight line-clamp-3 text-center";
const TILE_LABEL_ACTIVE = "text-green-700 dark:text-green-300";
const TILE_LABEL_IDLE = "text-gray-600 dark:text-gray-400";

// The homepage rail's rows — icon-only, so the label moves to `aria-label` /
// `title` on the link and the emoji becomes decorative. The `hover:` variant is
// not redundant: the standalone "All categories" link has no `group/row` wrapper
// of its own, and the redundant `group-hover/row:` is inert on it.
const RAIL_ROW =
  "flex items-center justify-center w-10 h-10 rounded-xl text-lg text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/60 group-hover/row:bg-gray-100 dark:group-hover/row:bg-gray-700/60";

/**
 * One group's leaves — the "All in this group" link plus the tile grid. Shared by
 * the `/browse` sidebar and the homepage rail so the taxonomy renders from one
 * place; only the positioning differs, and that arrives through `className`.
 *
 * `groupFiltering` is `activeGroup === group.slug`, and it is not that test under
 * another name: this asks whether the *whole group* is what the grid is filtered
 * to, so a leaf view leaves it idle and the highlighted tile below is the answer
 * instead. The rail passes neither scope prop — there is no URL scope on the
 * homepage — and `undefined === group.slug` is simply false.
 */
function SubcategoryPanel({
  group,
  activeCategory,
  activeGroup,
  className,
}: {
  group: CategoryGroup;
  activeCategory?: string;
  activeGroup?: string;
  className?: string;
}) {
  const members = categoriesInGroup(group.id);
  const groupFiltering = activeGroup === group.slug;

  return (
    <div
      role="group"
      aria-label={`${group.name} subcategories`}
      // Opaque and lifted, because two panels can share their exact geometry —
      // a panel is `absolute` out of its row, so a second row's panel paints at
      // the same coordinates — and the fill is what makes the hovered one
      // occlude rather than blend.
      // `p-3` doubles as the gap to the rail, and belongs *inside* the box: a
      // margin would leave the pointer crossing dead space on its way in, and
      // the hover would drop before it arrived.
      // `shadow-lg`, not `shadow-sm`, on both surfaces: every panel now overlays
      // whatever sits beside it — the homepage's shop sections, `/browse`'s own
      // grid — so the lift is what separates it from real content that is merely
      // underneath, not from the aside it used to sit inside.
      className={cn(
        "rounded-xl border border-gray-100 bg-white p-3 shadow-lg dark:border-gray-700/70 dark:bg-gray-800",
        className
      )}
    >
      {/* The group's own browse target. The rail row beside it is a group link
          too, but on a leaf view that row is *not* highlighted, so it does not
          read as the obvious way back to the whole group. */}
      <Link
        href={`/browse?group=${group.slug}`}
        aria-current={groupFiltering ? "true" : undefined}
        className={cn(ROW, "text-xs", groupFiltering ? ROW_ACTIVE : ROW_IDLE)}
      >
        <span
          aria-hidden="true"
          className="flex items-center justify-center w-7 h-7 shrink-0 rounded-lg text-base"
        >
          ↳
        </span>
        <span className="line-clamp-2">All in this group</span>
      </Link>

      {/* Three columns, not a single stack: the largest group has ten leaves, so
          this is four rows rather than ten, and the panel stays roughly as tall
          as the rail beside it. */}
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {members.map((cat) => {
          const active = activeCategory === cat.slug;

          return (
            <Link
              key={cat.id}
              href={`/browse?category=${cat.slug}`}
              title={cat.name}
              aria-current={active ? "true" : undefined}
              className={cn(TILE, active ? TILE_ACTIVE : TILE_IDLE)}
            >
              <span
                className={cn(TILE_ICON, active ? TILE_ICON_ACTIVE : TILE_ICON_IDLE)}
              >
                {cat.icon}
              </span>
              {/* `line-clamp-3` covers the long leaves — "Laundry & Dry Cleaning"
                  wraps rather than truncates — and `title` above carries the full
                  name for anything that does clip. */}
              <span
                className={cn(TILE_LABEL, active ? TILE_LABEL_ACTIVE : TILE_LABEL_IDLE)}
              >
                {cat.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function CategorySidebar({
  activeCategory,
  activeGroup,
}: CategorySidebarProps) {
  // No group is open on arrival, and there is no state or URL test that opens
  // one: this used to derive an `openGroup` from the scope props (an explicit
  // ?group=, else the group owning the active leaf) and render that panel as
  // `block` before any pointer arrived. On a leaf view like
  // /browse?category=plumber that painted a panel nobody had asked for, which is
  // the reported bug.
  //
  // The scope props are still read, but only to mark the *current* row and tile
  // — never to reveal anything. Revealing is now purely CSS
  // (`group-hover/row:` / `group-focus-within/row:` on the wrapper below), so
  // the only way a panel opens is by hovering or focusing its own row.
  //
  // The homepage's `CategoryRail` never had an opener to begin with, so this
  // makes the two surfaces identical rather than merely similar.
  return (
    // No `w-full`: the aside is sized by the rail inside it (12rem + its own
    // `p-3` = 13.5rem), so the column hands its width back to the listing. It
    // used to stretch to a reserved 32rem and leave a bordered empty box beside
    // the rail until something was hovered, which is the reported bug.
    <aside className="rounded-2xl border border-gray-100 dark:border-gray-700/70 bg-white dark:bg-gray-800/70 p-3">
      <h3 className="px-2 pt-1 pb-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        Categories
      </h3>

      {/* One pane now, not two. Still a Server Component — the reveal is pure CSS
          (named `group/row` variants, v3.2+), so there is no `useState` here and
          no JS shipped to decide it. Nothing is derived from the URL to open one,
          so panels are hover- and focus-only on every surface.

          The panel used to be sized `left-48 right-0` into a reserved column,
          which is what made that column load-bearing: the space existed only to
          be painted into. `left-full` + an explicit width instead — the panel is
          out of flow and overlays whatever sits beside the rail, so nothing has
          to be reserved for it and the column can collapse to the rail's own
          width. `left-full`, not `left-full` + a gap: the rail is exactly 12rem,
          so the panel's left edge lands on the nav's right edge and the pointer
          crosses no dead strip on its way in — a margin here would drop the
          hover before the pointer arrived.

          `relative` sits on this container rather than on the nav, and the
          per-row wrappers stay unpositioned, which is what pins every panel to
          the column's `top-0` instead of to its own row. The homepage rail does
          the opposite (per-row `relative`) because a ten-row strip that opened
          every panel at its top would open nowhere near the pointer; here the
          panel *is* the column, so the top is right. */}
      <div className="relative">
        {/* `w-48` is load-bearing now, not decorative: it is fixed, so it is what
            sizes the aside, the column, and the panel's `left-full` origin all at
            once. `shrink-0` went with the flex parent. */}
        <nav aria-label="Category groups" className="w-48 space-y-0.5">
          <Link
            href="/browse"
            aria-current={
              !activeCategory && !activeGroup ? "true" : undefined
            }
            className={cn(
              ROW,
              !activeCategory && !activeGroup ? ROW_ACTIVE : ROW_IDLE
            )}
          >
            <span className={ICON}>🧭</span>
            <span className="min-w-0 flex-1">All Categories</span>
          </Link>

          {categoryGroups.map((group) => {
            const groupActive = activeGroup === group.slug;

            return (
              <div key={group.id} className="group/row">
                <Link
                  href={`/browse?group=${group.slug}`}
                  aria-current={groupActive ? "true" : undefined}
                  className={cn(ROW, groupActive ? ROW_ACTIVE : cn(ROW_IDLE, ROW_LIT))}
                >
                  <span className={ICON}>{group.icon}</span>
                  {/* `line-clamp-2` is the longest-label guard: "Building,
                      Property & Interiors" is 30 characters, and at `text-xs` in
                      this rail it wraps to two lines rather than being cut
                      mid-phrase. */}
                  <span className="min-w-0 flex-1 text-left text-xs leading-tight line-clamp-2">
                    {group.name}
                  </span>
                  <span className="material-symbols-outlined shrink-0 text-[16px] text-gray-300 dark:text-gray-600">
                    chevron_right
                  </span>
                </Link>

                <SubcategoryPanel
                  group={group}
                  activeCategory={activeCategory}
                  activeGroup={activeGroup}
                  // `z-20` on hover because two panels can share this exact
                  // geometry — the pointer can only be over one row, but a
                  // panel is `absolute` out of its row so nothing else stops a
                  // second from painting at the same place.
                  //
                  // `w-[19rem]` matches the homepage rail's panel width, and is
                  // explicit because there is no longer a column to stretch
                  // against: `right-0` here would ask for a width of zero.
                  className={cn(
                    "absolute left-full top-0 z-10 w-[19rem]",
                    "hidden group-hover/row:z-20 group-focus-within/row:z-20",
                    "group-hover/row:block group-focus-within/row:block"
                  )}
                />
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

/**
 * The homepage's collapsed category entry point: a strip of the nine group icons
 * pinned to the top-left corner, just under the header, each expanding its
 * subcategories *rightward* on hover.
 *
 * It began down the right edge. Left is the better edge for it: the eye starts
 * there, "Categories" reads as a navigation column rather than as an aside, and
 * it no longer sits over the hero's next-arrow (`right-3`), which is what the
 * old position cost.
 *
 * `absolute`, not `fixed`, and that is the whole point. `fixed` pinned it to the
 * viewport, so it stayed put while the page scrolled and sat permanently over the
 * left edge of whatever section was passing underneath — at a 1280px viewport the
 * home sections' `max-w-7xl` leaves only their own `px-4`, so the strip landed on
 * real text and card edges. Absolute, it belongs to the page: it occupies the
 * top-left corner on arrival and scrolls away with the hero, covering nothing.
 * It is still out of flow, which is the property that matters for layout — every
 * home section self-wraps with its own `max-w-7xl mx-auto px-4 md:px-6`, so a
 * rail *in* the flow would nest containers and double the max-width and the
 * padding, and it stays invisible to the page's own "hero → shops" order.
 *
 * `hidden lg:flex`: below `lg` there is no hover to reveal anything and
 * `MobileNav` already carries the same taxonomy as a grouped drawer. Note that
 * `lg`+ is also where a touch device has no reveal at all — a rail row is still
 * a real link to `/browse?group=…`, but the panel no longer opens on arrival
 * there (see the sidebar above: nothing derives an open group from the URL any
 * more), so that tap lands on the group's listing with every panel closed.
 *
 * `z-40` keeps it under the sticky header (`z-50`). `top-8`, not the `top-28` a
 * fixed rail needed: the header is `sticky`, so it still occupies its 5rem in
 * the flow and this nav's containing block already begins below it — `top-28`
 * would clear the header a second time and drop the rail 80px too low. `top-8`
 * puts it back at the same on-screen 112px the fixed version resolved to.
 */
export function CategoryRail() {
  return (
    <nav
      aria-label="Categories"
      className="absolute left-3 top-8 z-40 hidden gap-1 rounded-2xl border border-gray-100 bg-white/95 p-1.5 shadow-lg backdrop-blur lg:flex lg:flex-col dark:border-gray-700/70 dark:bg-gray-800/95"
    >
      {/* The rail's one piece of always-visible text. Nine emoji down an edge
          read as decoration until you happen to hover one, which is the reported
          complaint — so the word goes above them, before any pointer arrives.

          `aria-hidden`: the `<nav>` already carries `aria-label="Categories"`,
          so a screen reader announces the landmark under exactly this name and a
          second announcement of the same word is noise. This exists for the
          sighted-by-default case.

          A label, not a link — the 🧭 row directly beneath it is already the way
          to /browse, and a clickable thing styled as a caption is worse than a
          caption. Styled from the `/browse` sidebar's own `<h3>`
          (`text-gray-400 dark:text-gray-500 uppercase`), sized to the strip:
          `text-[10px]` and `tracking-wide` rather than the sidebar's
          `tracking-wider`, which at `w-10` rows makes "CATEGORIES" the widest
          thing in the rail for no gain.

          The rail widens ~54px → ~74px. Every panel pins `left-full` against
          this nav, so they all shift right by the same amount on their own. */}
      <p
        aria-hidden="true"
        className="px-1 pb-1 pt-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500"
      >
        Categories
      </p>

      <Link
        href="/browse"
        title="All categories"
        aria-label="All categories"
        className={RAIL_ROW}
      >
        <span aria-hidden="true">🧭</span>
      </Link>

      {categoryGroups.map((group) => (
        // `relative` here, unlike the sidebar's wrappers: there is no reserved
        // column to size against, so the panel is given an explicit width and
        // pinned to its own row — one that jumped to the top of a ten-row strip
        // would open nowhere near the pointer. It also puts the panel's left
        // edge exactly on the row's right edge, so the pointer crosses no gap.
        <div key={group.id} className="group/row relative">
          <Link
            href={`/browse?group=${group.slug}`}
            title={group.name}
            aria-label={group.name}
            className={RAIL_ROW}
          >
            <span aria-hidden="true">{group.icon}</span>
          </Link>

          {/* Hover-only, like every panel now: `CategoryRail` has no URL scope to
              derive one from, and the sidebar gave its own URL-derived opener up
              so the two surfaces behave identically. */}
          <SubcategoryPanel
            group={group}
            className="absolute left-full top-0 z-10 hidden w-[19rem] group-hover/row:block group-focus-within/row:block"
          />
        </div>
      ))}
    </nav>
  );
}
