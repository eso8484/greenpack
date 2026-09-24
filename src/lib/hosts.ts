/**
 * Host helpers for the three-host setup.
 *
 * The customer site, the vendor center, and the courier hub are served by the
 * same Next.js deployment, but reached on different hostnames. That matters for
 * auth: the Supabase session cookie is host-only (nothing in this app sets a
 * `Domain` attribute), so each host keeps its own independent session. For the
 * vendor center that is the whole point — signing in as a vendor must never
 * replace the customer session. For the courier hub it is a side effect: a
 * courier's account *is* their customer account, but the cookie still cannot
 * cross, so signing in on the hub leaves them a guest on the main site until
 * they sign in there too.
 *
 * Anything linking between hosts must therefore use an absolute URL. A bare
 * `/dashboard` stays on whichever host rendered it.
 */

/** Origin of the vendor center. Override locally with NEXT_PUBLIC_VENDOR_URL. */
export const VENDOR_ORIGIN =
  process.env.NEXT_PUBLIC_VENDOR_URL ?? "https://vendor.greenpackdelight.com";

/** Origin of the courier hub. Override locally with NEXT_PUBLIC_COURIER_URL. */
export const COURIER_ORIGIN =
  process.env.NEXT_PUBLIC_COURIER_URL ?? "https://courier.greenpackdelight.com";

/** Origin of the customer-facing site. Override locally with NEXT_PUBLIC_SITE_URL. */
export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://greenpackdelight.com";

/**
 * The hostname an origin points at, lowercased — or "" when the env var is
 * malformed. A blank result is not an error state: `isSubdomainHost` below still
 * matches on the first label, so a bad `NEXT_PUBLIC_*_URL` degrades to dev-style
 * detection instead of to a host that never matches anything.
 */
function configuredHostname(origin: string): string {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

const CONFIGURED_VENDOR_HOSTNAME = configuredHostname(VENDOR_ORIGIN);
const CONFIGURED_COURIER_HOSTNAME = configuredHostname(COURIER_ORIGIN);

/** `vendor.localhost:3000` → `vendor.localhost` */
function hostnameOf(host: string): string {
  return host.split(":")[0].trim().toLowerCase();
}

/**
 * The rule both subdomains share: match the configured hostname, and also any
 * host whose first label is `label`, so `vendor.localhost` works in dev with no
 * configuration. Kept in one place so the two can't drift into disagreeing about
 * ports, casing, or trailing whitespace.
 *
 * `configured` and `label` always belong to the same subdomain, so they cannot
 * both match a single hostname that the other one also matches — a courier host
 * is never a vendor host.
 */
function isSubdomainHost(
  host: string | null | undefined,
  configured: string,
  label: string
): boolean {
  if (!host) return false;
  const hostname = hostnameOf(host);
  if (!hostname) return false;

  if (configured && hostname === configured) {
    return true;
  }

  return hostname.split(".")[0] === label;
}

/**
 * Is this request for the vendor center?
 *
 * Always test this *before* `isCourierHost` in a branch chain — not because both
 * can be true (they can't), but because the vendor host is the older, more
 * load-bearing one: if either env var is ever misconfigured to point at the
 * other's hostname, the vendor rules should win.
 */
export function isVendorHost(host: string | null | undefined): boolean {
  return isSubdomainHost(host, CONFIGURED_VENDOR_HOSTNAME, "vendor");
}

/** Is this request for the courier hub? */
export function isCourierHost(host: string | null | undefined): boolean {
  return isSubdomainHost(host, CONFIGURED_COURIER_HOSTNAME, "courier");
}

/** Absolute URL on the vendor center. */
export function vendorUrl(path = "/"): string {
  return new URL(path, VENDOR_ORIGIN).toString();
}

/** Absolute URL on the courier hub. */
export function courierUrl(path = "/"): string {
  return new URL(path, COURIER_ORIGIN).toString();
}

/** Absolute URL on the customer site. */
export function siteUrl(path = "/"): string {
  return new URL(path, SITE_ORIGIN).toString();
}
