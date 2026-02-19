import Link from "next/link";

export default function SellPage() {
    return (
        <div className="min-h-screen bg-[#f6f8f7] dark:bg-[#122017]">
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-green-900" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-500/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" />

                <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
                    <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8 border border-green-500/20">
                        <span className="material-symbols-outlined text-sm fill-1">
                            storefront
                        </span>
                        For Sellers &amp; Service Providers
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tight mb-6">
                        Grow your business on{" "}
                        <span className="text-green-400">GreenPack</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Whether you sell products or offer services, reach thousands of
                        customers looking for quality local businesses. List your shop,
                        showcase your work, and start earning.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/register">
                            <button className="bg-green-500 hover:bg-green-600 text-white font-bold px-10 py-4 rounded-xl shadow-xl shadow-green-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer text-base">
                                Register Your Business
                            </button>
                        </Link>
                        <a href="#how-it-works">
                            <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold px-10 py-4 rounded-xl border border-white/20 transition-all cursor-pointer text-base">
                                Learn How It Works
                            </button>
                        </a>
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="max-w-6xl mx-auto px-6 py-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                        Why sell on GreenPack?
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                        Everything you need to grow your business, all in one place.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow">
                        <div className="w-14 h-14 bg-green-500/10 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mb-5">
                            <span className="material-symbols-outlined text-3xl">
                                visibility
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            Get Discovered
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                            Thousands of customers browse GreenPack daily looking for trusted
                            local businesses. Get your shop in front of them.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow">
                        <div className="w-14 h-14 bg-green-500/10 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mb-5">
                            <span className="material-symbols-outlined text-3xl">
                                dashboard_customize
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            Easy Management
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                            Use our seller dashboard to manage your products, services,
                            orders, and shop profile — all from one place.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow">
                        <div className="w-14 h-14 bg-green-500/10 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mb-5">
                            <span className="material-symbols-outlined text-3xl">
                                verified
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                            Build Trust
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                            Earn the Green Certified badge and stand out from the competition.
                            Verified businesses get more visibility and orders.
                        </p>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section
                id="how-it-works"
                className="bg-white dark:bg-gray-900/50 py-24 px-6"
            >
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                            Get started in 3 easy steps
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg shadow-green-500/20">
                                1
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                Register
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Create your vendor account with your business details. It only
                                takes a few minutes.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg shadow-green-500/20">
                                2
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                Set Up Your Shop
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Add your products, services, images, and business hours. Make
                                your shop stand out.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-black shadow-lg shadow-green-500/20">
                                3
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                Start Earning
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Go live and start receiving orders and bookings from customers
                                in your area.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Who Can Sell */}
            <section className="max-w-6xl mx-auto px-6 py-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                        Who can sell on GreenPack?
                    </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { icon: "content_cut", label: "Barbers & Stylists" },
                        { icon: "local_laundry_service", label: "Laundry Services" },
                        { icon: "restaurant", label: "Food Vendors" },
                        { icon: "apparel", label: "Tailors & Fashion" },
                        { icon: "spa", label: "Beauty & Wellness" },
                        { icon: "build", label: "Repair Services" },
                        { icon: "shopping_bag", label: "Product Sellers" },
                        { icon: "home_repair_service", label: "Home Services" },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 text-center hover:border-green-500/40 hover:shadow-lg transition-all"
                        >
                            <div className="w-14 h-14 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-2xl">
                                    {item.icon}
                                </span>
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white text-sm">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="max-w-5xl mx-auto px-6 pb-24">
                <div className="bg-gray-900 rounded-3xl p-12 md:p-20 relative overflow-hidden text-center text-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

                    <h2 className="text-3xl md:text-4xl font-black mb-4 relative z-10">
                        Ready to grow your business?
                    </h2>
                    <p className="text-gray-400 text-lg max-w-xl mx-auto mb-8 relative z-10">
                        Join hundreds of businesses already thriving on GreenPack. It&apos;s
                        free to get started.
                    </p>
                    <Link href="/register" className="relative z-10">
                        <button className="bg-green-500 hover:bg-green-600 text-white font-bold px-10 py-4 rounded-xl shadow-xl shadow-green-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer text-base">
                            Register Your Business Now
                        </button>
                    </Link>

                    <p className="mt-6 text-sm text-gray-500 relative z-10">
                        Already registered?{" "}
                        <Link
                            href="/login"
                            className="text-green-400 hover:underline font-semibold"
                        >
                            Log in to your dashboard →
                        </Link>
                    </p>
                </div>
            </section>
        </div>
    );
}
