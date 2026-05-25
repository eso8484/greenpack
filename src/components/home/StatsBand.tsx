import Link from "next/link";

interface StatsBandProps {
  /** All real, computed from the live shop list in page.tsx. */
  shops: number;
  verified: number;
  categories: number;
  areas: number;
}

export default function StatsBand({ shops, verified, categories, areas }: StatsBandProps) {
  const stats = [
    { label: "Local shops", value: shops, icon: "storefront" },
    { label: "Verified & certified", value: verified, icon: "verified" },
    { label: "Categories", value: categories, icon: "category" },
    { label: "Areas covered", value: areas, icon: "location_on" },
  ].filter((s) => s.value > 0);

  if (!stats.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 pt-14 md:pt-20">
      <div className="relative overflow-hidden rounded-3xl bg-mesh-green px-6 py-10 md:px-12 md:py-12">
        <div className="absolute inset-0 bg-grid-faint opacity-50" aria-hidden />
        <div
          className="absolute -top-16 right-10 w-72 h-72 rounded-full bg-accent-500/15 blur-3xl animate-float"
          aria-hidden
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="max-w-md">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              A growing marketplace you can{" "}
              <span className="text-gradient-green">trust</span>
            </h2>
            <p className="mt-2 text-sm md:text-base text-green-50/80">
              Every certified business passes our community trust check before it
              appears here.
            </p>
            <Link
              href="/browse"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white text-gray-900 px-6 py-3 text-sm font-bold hover:bg-green-50 transition-colors shadow-lg"
            >
              Start exploring
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 px-4 py-4 text-center min-w-[120px]"
              >
                <span className="material-symbols-outlined text-green-300 text-2xl fill-1">
                  {s.icon}
                </span>
                <div className="mt-1 text-2xl md:text-3xl font-black text-white tabular-nums">
                  {s.value.toLocaleString()}
                </div>
                <div className="text-[11px] font-medium text-green-50/70 uppercase tracking-wide">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
