import Link from "next/link";
import { categories } from "@/lib/data/categories";

export default function Footer() {
  return (
    <footer className="bg-green-900 dark:bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-bold mb-3">
              Green<span className="text-green-400">Pack</span>
            </h3>
            <p className="text-sm text-green-200 leading-relaxed">
              Discover local shops and service providers near you. Connect with
              trusted businesses for products and services.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-green-300 mb-3">
              Categories
            </h4>
            <ul className="space-y-2">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/browse?category=${cat.slug}`}
                    className="text-sm text-green-200 hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-green-300 mb-3">
              Support
            </h4>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-green-200">Help Center</span>
              </li>
              <li>
                <span className="text-sm text-green-200">How It Works</span>
              </li>
              <li>
                <span className="text-sm text-green-200">Terms of Service</span>
              </li>
              <li>
                <span className="text-sm text-green-200">Privacy Policy</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-green-300 mb-3">
              Contact
            </h4>
            <ul className="space-y-2">
              <li className="text-sm text-green-200">
                info@greenpack.ng
              </li>
              <li className="text-sm text-green-200">
                +234 800 GREENPACK
              </li>
              <li className="text-sm text-green-200">Lagos, Nigeria</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-green-800 dark:border-gray-800 mt-8 pt-6 text-center">
          <p className="text-sm text-green-300">
            &copy; {new Date().getFullYear()} GreenPack. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
