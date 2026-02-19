import Link from "next/link";
import Image from "next/image";
import { categories } from "@/lib/data/categories";

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* About */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/logo.png"
                alt="Green Pack Delight Logo"
                width={32}
                height={32}
                className="rounded-full"
                unoptimized
              />
              <span className="text-xl font-bold text-white">
                Green<span className="text-green-400">Pack</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              The premium platform for local service discovery. We bridge the
              gap between quality businesses and conscious customers.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {["twitter", "instagram", "facebook"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-9 h-9 rounded-full bg-gray-800 hover:bg-green-600 flex items-center justify-center transition-colors"
                  aria-label={social}
                >
                  <svg
                    className="w-4 h-4 text-gray-400 hover:text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Home", href: "/" },
                { label: "Browse Shops", href: "/browse" },
                { label: "Categories", href: "/browse" },
                { label: "How It Works", href: "/" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-green-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Categories
            </h4>
            <ul className="space-y-3">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/browse?category=${cat.slug}`}
                    className="text-sm text-gray-400 hover:text-green-400 transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Support
            </h4>
            <ul className="space-y-3">
              <li>
                <span className="text-sm text-gray-400">Help Center</span>
              </li>
              <li>
                <span className="text-sm text-gray-400">Terms of Service</span>
              </li>
              <li>
                <span className="text-sm text-gray-400">Privacy Policy</span>
              </li>
            </ul>
            <div className="mt-6 space-y-2">
              <p className="text-sm text-gray-500">
                <span className="text-gray-400">Email:</span>{" "}
                info@greenpackdelight.ng
              </p>
              <p className="text-sm text-gray-500">
                <span className="text-gray-400">Phone:</span> +234 800
                GREENPACK
              </p>
              <p className="text-sm text-gray-500">
                <span className="text-gray-400">Location:</span> Abuja, Nigeria
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Green Pack Delight. All rights
            reserved.
          </p>
          <p className="text-xs text-gray-600">
            Made with 💚 for local businesses
          </p>
        </div>
      </div>
    </footer>
  );
}
