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
      <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        Categories
      </h3>
      <nav className="space-y-0.5">
        <Link
          href="/browse"
          className={cn(
            "block px-3 py-2 text-sm rounded-lg transition-colors",
            !activeCategory
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
        >
          All Categories
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/browse?category=${cat.slug}`}
            className={cn(
              "flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors",
              activeCategory === cat.slug
                ? "bg-green-100 text-green-700 font-medium"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <span className="flex items-center gap-2">
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{cat.shopCount}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
