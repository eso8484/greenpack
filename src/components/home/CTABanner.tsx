import Link from "next/link";
import Button from "@/components/ui/Button";

export default function CTABanner() {
    return (
        <section className="py-16">
            <div className="max-w-7xl mx-auto px-4">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-green-500 to-emerald-500">
                    {/* Background decoration */}
                    <div className="absolute inset-0">
                        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-2xl" />
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl" />
                        <div
                            className="absolute inset-0 opacity-[0.04]"
                            style={{
                                backgroundImage:
                                    "radial-gradient(circle, white 1px, transparent 1px)",
                                backgroundSize: "30px 30px",
                            }}
                        />
                    </div>

                    <div className="relative px-8 py-14 md:px-16 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="text-center md:text-left max-w-lg">
                            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                                Own a local
                                <br />
                                shop?
                            </h2>
                            <p className="mt-4 text-green-100/90 text-lg leading-relaxed">
                                Get discovered by thousands of customers looking for quality
                                services. Join the Green Pack community today.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link href="/register">
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    className="bg-white text-green-700 hover:bg-green-50 shadow-lg shadow-black/10 font-semibold whitespace-nowrap"
                                >
                                    Register Your Shop
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="border-white/40 text-white hover:bg-white/10 backdrop-blur-sm whitespace-nowrap"
                                >
                                    Learn More
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
