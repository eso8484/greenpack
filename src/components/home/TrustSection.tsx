export default function TrustSection() {
    return (
        <section className="max-w-7xl mx-auto px-6 py-24 border-t border-green-500/5">
            <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
                    Building Trust,{" "}
                    <span className="text-green-500 text-3xl block md:inline">
                        One Neighborhood at a Time
                    </span>
                </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
                {/* Discover */}
                <div className="text-center">
                    <div className="w-20 h-20 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl">
                            travel_explore
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        Discover
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        Browse a curated list of the finest local services. Use
                        categories or search to find exactly what you need.
                    </p>
                </div>

                {/* Verify */}
                <div className="text-center">
                    <div className="w-20 h-20 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl">
                            verified_user
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        Verify
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        Look for the Green Badge. Every certified shop has been physically
                        vetted for quality and reliability.
                    </p>
                </div>

                {/* Support Local */}
                <div className="text-center">
                    <div className="w-20 h-20 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl">
                            favorite
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        Support Local
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        Book services directly and support the heartbeat of the community.
                        Grow your community, one visit at a time.
                    </p>
                </div>
            </div>
        </section>
    );
}
