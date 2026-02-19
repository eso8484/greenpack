import Link from "next/link";

export default function CTABanner() {
    return (
        <section className="max-w-7xl mx-auto px-6 mb-24">
            <div className="bg-gray-900 rounded-3xl p-12 md:p-20 relative overflow-hidden text-center text-white">
                {/* Decorative glow circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

                <h2 className="text-4xl md:text-5xl font-black mb-6 relative z-10">
                    Own a local business?
                </h2>
                <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 relative z-10">
                    Get discovered by thousands of customers looking for quality services.
                    Join the Green Pack community today.
                </p>
                <div className="flex flex-col md:flex-row gap-4 justify-center relative z-10">
                    <Link href="/sell">
                        <button className="bg-green-500 hover:bg-green-600 text-white font-bold px-10 py-4 rounded-xl shadow-xl shadow-green-500/20 transition-all cursor-pointer">
                            List Your Business
                        </button>
                    </Link>
                    <Link href="/register">
                        <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold px-10 py-4 rounded-xl border border-white/20 transition-all cursor-pointer">
                            Learn More
                        </button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
