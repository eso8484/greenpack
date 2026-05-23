import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-green-500/5 py-16 px-6">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
        {/* About - spans 2 cols */}
        <div className="col-span-1 md:col-span-2">
          <Link href="/" className="flex items-center gap-3 mb-6">
            <Image
              src="/logo.png"
              alt="Green Pack Delight Logo"
              width={32}
              height={32}
              className="rounded"
              unoptimized
            />
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Green Pack Delight
            </span>
          </Link>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed text-sm">
            The premium platform for local service discovery in Lagos. We bridge
            the gap between quality businesses and conscious customers.
          </p>
          {/* Social icons */}
          <div className="flex gap-4">
            <a
              href="https://x.com/greenpackdeligh?s=21"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-green-500 hover:text-white text-gray-500 transition-colors"
              aria-label="Follow on X (formerly Twitter)"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/greenpackdelight_laundry?igsh=MTI4dDd1aXpsb3UxOA%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-green-500 hover:text-white text-gray-500 transition-colors"
              aria-label="Follow on Instagram"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-6">
            Quick Links
          </h3>
          <ul className="space-y-4 text-gray-500 dark:text-gray-400 text-sm">
            <li>
              <Link
                href="/"
                className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                About Us
              </Link>
            </li>
            <li>
              <Link
                href="/browse"
                className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Verified Shops
              </Link>
            </li>
            <li>
              <Link
                href="/sell"
                className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Sell on GreenPack
              </Link>
            </li>
            <li>
              <Link
                href="/become-courier"
                className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Become a Courier
              </Link>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-6">
            Support
          </h3>
          <ul className="space-y-4 text-gray-500 dark:text-gray-400 text-sm">
            <li>
              <Link
                href="/help"
                className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Help Center
              </Link>
            </li>
            <li>
              <Link
                href="/help?chat=1"
                className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Contact Support
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-gray-400 dark:text-gray-500 text-xs text-center md:text-left">
          © {new Date().getFullYear()} Green Pack Delight. All rights reserved.
        </p>
        <div className="flex gap-4 items-center text-gray-400 dark:text-gray-500 text-xs">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">language</span>{" "}
            English (NGN)
          </span>
        </div>
      </div>
    </footer>
  );
}
