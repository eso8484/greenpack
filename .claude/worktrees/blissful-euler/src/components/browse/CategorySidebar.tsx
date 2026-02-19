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
    <aside className="w-full">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sticky top-20">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-3">
          Categories
        </h3>
        <nav className="space-y-0.5">
          <Link
            href="/browse"
            className={cn(
              "block px-3 py-2.5 text-sm rounded-xl transition-all",
              !activeCategory
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-green"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            All Categories
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/browse?category=${cat.slug}`}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 text-sm rounded-xl transition-all",
                activeCategory === cat.slug
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-green"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">{cat.icon}</span>
                <span>{cat.name}</span>
              </span>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-md",
                  activeCategory === cat.slug
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                )}
              >
                {cat.shopCount}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
