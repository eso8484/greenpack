import Link from "next/link";
import { categories } from "@/lib/data/categories";

export default function CategoryNav() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 pt-14 md:pt-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Explore categories
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Whatever you need, a verified pro is nearby.
          </p>
        </div>
        <Link
          href="/browse"
          className="hidden md:inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-bold group"
        >
          View all
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 md:gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/browse?category=${cat.slug}`}
            className="group flex flex-col items-center gap-2.5 rounded-2xl bg-white dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700/70 p-3 md:p-4 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-0.5 transition-all text-center"
          >
            <span className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/20 text-2xl md:text-3xl group-hover:from-green-500 group-hover:to-emerald-500 transition-all">
              {cat.icon}
            </span>
            <span className="text-[11px] md:text-xs font-semibold text-gray-700 dark:text-gray-300 leading-tight line-clamp-2">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
