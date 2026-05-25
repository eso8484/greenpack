import Link from "next/link";
import { categories } from "@/lib/data/categories";
import { cn } from "@/lib/utils";

interface CategorySidebarProps {
  activeCategory?: string;
}

export default function CategorySidebar({
  activeCategory,
}: CategorySidebarProps) {
  return (
    <aside className="w-full rounded-2xl border border-gray-100 dark:border-gray-700/70 bg-white dark:bg-gray-800/70 p-3">
      <h3 className="px-2 pt-1 pb-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        Categories
      </h3>
      <nav className="space-y-1">
        <Link
          href="/browse"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-colors",
            !activeCategory
              ? "bg-green-500/10 text-green-700 dark:text-green-300 font-bold"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60"
          )}
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-800/20 text-base">
            🧭
          </span>
          All Categories
        </Link>
        {categories.map((cat) => {
          const active = activeCategory === cat.slug;
          return (
            <Link
              key={cat.id}
              href={`/browse?category=${cat.slug}`}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-colors",
                active
                  ? "bg-green-500/10 text-green-700 dark:text-green-300 font-bold"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-lg text-base transition-colors",
                  active
                    ? "bg-green-500 text-white"
                    : "bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-800/20"
                )}
              >
                {cat.icon}
              </span>
              <span className="line-clamp-1">{cat.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
