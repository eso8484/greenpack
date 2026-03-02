"use client";

export default function HeroSection() {
  const isVisible = true;

  return (
    <section
      className="relative w-full flex items-center justify-center px-6 overflow-hidden hero-gradient"
      style={{ height: 640 }}
    >
      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-green-500/10" />

      {/* Content */}
      <div
        className={`relative z-10 max-w-4xl w-full text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
      >
        <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] mb-6 tracking-tight">
          Discover the best{" "}
          <br />
          <span className="text-green-400">near you</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-100/90 mb-10 max-w-2xl mx-auto font-medium">
          Connecting you with trusted local services and authentic shops in your
          neighborhood.
        </p>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-900 p-2 md:p-3 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2 max-w-3xl mx-auto border border-white/20">
          <div className="flex-1 flex items-center px-4 gap-3 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800">
            <span className="material-symbols-outlined text-gray-400">
              search
            </span>
            <input
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-400 py-4 text-sm"
              placeholder="Laundry, barbers, food..."
              type="text"
            />
          </div>
          <div className="flex-1 flex items-center px-4 gap-3">
            <span className="material-symbols-outlined text-gray-400">
              location_on
            </span>
            <input
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-400 py-4 text-sm"
              placeholder="Enter your city..."
              type="text"
            />
          </div>
          <button className="bg-green-500 text-white px-10 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all text-sm cursor-pointer">
            Search Now
          </button>
        </div>
      </div>
    </section>
  );
}
