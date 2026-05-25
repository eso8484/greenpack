import Link from "next/link";

export default function CTABanner() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <div className="relative overflow-hidden rounded-3xl bg-mesh-green px-6 py-14 md:px-20 md:py-20 text-center text-white">
        <div className="absolute inset-0 bg-grid-faint opacity-50" aria-hidden />
        <div
          className="absolute top-0 right-0 w-72 h-72 bg-accent-500/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl animate-float"
          aria-hidden
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 bg-green-500/25 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl animate-float-slow"
          aria-hidden
        />

        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-black mb-5 tracking-tight">
            Own a local business?
          </h2>
          <p className="text-green-50/85 text-base md:text-xl max-w-2xl mx-auto mb-9">
            Get discovered by thousands of customers looking for quality services.
            Join the Green Pack community today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sell"
              className="bg-white text-gray-900 hover:bg-green-50 font-bold px-9 py-4 rounded-xl shadow-xl transition-all"
            >
              List your business
            </Link>
            <Link
              href="/register"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold px-9 py-4 rounded-xl border border-white/20 transition-all"
            >
              Learn more
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
