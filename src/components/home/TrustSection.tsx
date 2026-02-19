const steps = [
    {
        number: "01",
        title: "Discover",
        description:
            "Browse a curated list of the finest local services. Use categories or search to find exactly what you need.",
        icon: (
            <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
        ),
        gradient: "from-green-500 to-emerald-400",
    },
    {
        number: "02",
        title: "Verify",
        description:
            "Look for the Green Badge. Every certified shop has been physically vetted for quality and reliability.",
        icon: (
            <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
            </svg>
        ),
        gradient: "from-emerald-500 to-teal-400",
    },
    {
        number: "03",
        title: "Support Local",
        description:
            "Book services directly and support the heartbeat of the community. Grow your neighborhood, one visit at a time.",
        icon: (
            <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
            </svg>
        ),
        gradient: "from-teal-500 to-cyan-400",
    },
];

export default function TrustSection() {
    return (
        <section className="py-20 bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-14">
                    <span className="inline-block text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                        Our Promise
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        Building Trust, One
                        <br />
                        Neighborhood at a Time
                    </h2>
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                    {steps.map((step) => (
                        <div
                            key={step.number}
                            className="group relative text-center p-8 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-800 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5 hover:-translate-y-1"
                        >
                            {/* Step number */}
                            <div className="absolute top-4 right-4 text-5xl font-black text-gray-100 dark:text-gray-800 group-hover:text-green-100 dark:group-hover:text-green-900/40 transition-colors select-none">
                                {step.number}
                            </div>

                            {/* Icon */}
                            <div
                                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mx-auto mb-5 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
                            >
                                {step.icon}
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                {step.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
