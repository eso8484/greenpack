/**
 * Host helpers for the two-host setup.
 *
 * The customer site and the vendor center are served by the same Next.js
 * deployment, but reached on different hostnames. That matters for auth: the
 * Supabase session cookie is host-only (nothing in this app sets a `Domain`
 * attribute), so each host keeps its own independent session. That is the whole
 * point of the split — signing into the vendor center must never replace the
 * customer session, and vice versa.
 *
 * Anything linking between the two hosts must therefore use an absolute URL. A
 * bare `/dashboard` stays on whichever host rendered it.
 */

/** Origin of the vendor center. Override locally with NEXT_PUBLIC_VENDOR_URL. */
export const VENDOR_ORIGIN =
  process.env.NEXT_PUBLIC_VENDOR_URL ?? "https://vendor.greenpackdelight.com";

/** Origin of the customer-facing site. Override locally with NEXT_PUBLIC_SITE_URL. */
export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://greenpackdelight.com";

const CONFIGURED_VENDOR_HOSTNAME = (() => {
  try {
    return new URL(VENDOR_ORIGIN).hostname.toLowerCase();
  } catch {
    // Malformed env var — fall back to the first-label check alone.
    return "";
  }
})();

/** `vendor.localhost:3000` → `vendor.localhost` */
function hostnameOf(host: string): string {
  return host.split(":")[0].trim().toLowerCase();
}

/**
 * Is this request for the vendor center?
 *
 * Matches the configured vendor hostname, and also any host whose first label
 * is `vendor`, so `vendor.localhost` works in dev without extra configuration.
 */
export function isVendorHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = hostnameOf(host);
  if (!hostname) return false;

  if (CONFIGURED_VENDOR_HOSTNAME && hostname === CONFIGURED_VENDOR_HOSTNAME) {
    return true;
  }

  return hostname.split(".")[0] === "vendor";
}

/** Absolute URL on the vendor center. */
export function vendorUrl(path = "/"): string {
  return new URL(path, VENDOR_ORIGIN).toString();
}

/** Absolute URL on the customer site. */
export function siteUrl(path = "/"): string {
  return new URL(path, SITE_ORIGIN).toString();
}
