import Link from "next/link";
import Button from "@/components/ui/Button";

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-green-600 via-green-500 to-green-400 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Discover Local
            <br />
            Shops & Services
          </h1>
          <p className="mt-4 text-lg md:text-xl text-green-100 leading-relaxed max-w-lg">
            Find trusted businesses near you. From barbers to laundry, phone
            repair to fashion — connect with service providers in your area.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/browse">
              <Button
                size="lg"
                className="bg-white text-green-600 hover:bg-green-50 active:bg-green-100"
              >
                Explore Now
              </Button>
            </Link>
            <Link href="/browse">
              <Button
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
              >
                View Categories
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
