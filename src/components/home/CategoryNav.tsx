import Link from "next/link";
import { categories } from "@/lib/data/categories";

export default function CategoryNav() {
  return (
    <section className="py-14">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="inline-block text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
              Whatever you need
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Explore Categories
            </h2>
            <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm">
              We have a verified professional nearby.
            </p>
          </div>
          <Link
            href="/browse"
            className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors group"
          >
            View all
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/browse?category=${cat.slug}`}
              className="group flex flex-col items-center gap-3 p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300 hover:-translate-y-1"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform duration-300">
                {cat.icon}
              </span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
