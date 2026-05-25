const steps = [
  {
    icon: "travel_explore",
    title: "Discover",
    body: "Browse a curated list of the finest local services. Use categories or search to find exactly what you need.",
  },
  {
    icon: "verified_user",
    title: "Verify",
    body: "Look for the Green Badge. Every certified shop is physically vetted for quality and reliability.",
  },
  {
    icon: "handshake",
    title: "Support local",
    body: "Connect with vendors directly and support the heartbeat of your community, one visit at a time.",
  },
];

export default function TrustSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24">
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-3">
          How it works
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
          Building trust,{" "}
          <span className="text-gradient-green">one neighborhood at a time</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-5 md:gap-6">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="relative rounded-3xl bg-white dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700/70 p-7 md:p-8 hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1 transition-all"
          >
            <span className="absolute top-6 right-6 text-5xl font-black text-green-500/10 dark:text-green-400/10 tabular-nums">
              {i + 1}
            </span>
            <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 mb-5">
              <span className="material-symbols-outlined text-3xl">{step.icon}</span>
            </span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
