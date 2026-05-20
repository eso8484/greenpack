import type { NextConfig } from "next";

/**
 * Security response headers applied to every route.
 *
 * The CSP intentionally allows the third parties this app actually uses:
 *   - Supabase (auth/db/storage)         → connect-src, img-src
 *   - Paystack (checkout redirect)       → connect/frame/form-action
 *   - Google Fonts (Material Symbols)    → style-src + font-src
 *   - Nominatim/Google geocoding         → connect-src
 *   - placehold.co + remote shop images  → img-src https:
 *
 * `script-src` keeps 'unsafe-inline'/'unsafe-eval' because Next.js injects an
 * inline bootstrap and the dev runtime uses eval; tightening this to nonces is
 * a follow-up. Even so, object-src/base-uri/frame-ancestors are locked down and
 * the app has no HTML-injection sinks (no dangerouslySetInnerHTML).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.paystack.co https://nominatim.openstreetmap.org https://maps.googleapis.com",
  "frame-src 'self' https://www.google.com https://maps.google.com https://*.paystack.co https://checkout.paystack.com",
  "form-action 'self' https://checkout.paystack.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  // Force HTTPS for 2 years (ignored by browsers over plain HTTP, so safe in dev).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Clickjacking: disallow framing by other origins.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Stop MIME-type sniffing (defends uploaded-file content-type confusion).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs (which can carry tokens/ids) to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop legacy cross-domain policy surface.
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  // Least-privilege browser features. Geolocation is allowed (self) because the
  // vendor/courier/customer location pickers use it; everything else is denied.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
