import Link from "next/link";
import { categories } from "@/lib/data/categories";

export default function CategoryNav() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20">
      <div className="flex items-end justify-between mb-12">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Explore Categories
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Whatever you need, we have a verified professional nearby.
          </p>
        </div>
        <Link
          href="/browse"
          className="hidden md:flex items-center gap-1 text-green-600 dark:text-green-400 font-bold group"
        >
          View all{" "}
          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-6">
        {categories.slice(0, 6).map((cat) => (
          <Link
            key={cat.id}
            href={`/browse?category=${cat.slug}`}
            className="group cursor-pointer bg-white dark:bg-gray-800 p-4 md:p-8 rounded-xl md:rounded-2xl border border-green-500/5 hover:border-green-500/40 hover:shadow-xl hover:shadow-green-500/5 transition-all text-center"
          >
            <div className="bg-[#f6f8f7] dark:bg-[#122017] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500 group-hover:text-white transition-all">
              <span className="text-3xl">{cat.icon}</span>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              {cat.name}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
