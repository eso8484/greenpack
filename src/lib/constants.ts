export const SITE_NAME = "GreenPack";
export const SITE_DESCRIPTION =
  "Discover local shops and services near you";
export const CURRENCY = "NGN";
export const CURRENCY_SYMBOL = "₦";
export const ITEMS_PER_PAGE = 12;

// Absolute URL for the logo used in transactional emails. Must be a public,
// non-redirecting https URL (the apex 307-redirects to www, and some email
// clients won't follow image redirects), so we point straight at www.
export const EMAIL_LOGO_URL = "https://www.greenpackdelight.com/logo.png";

// === Contact Details ===
// The single home for the addresses and the number the site publishes and every
// transactional email signs off with. They live together on purpose: the two
// surfaces are edited by different routes, and a copy pasted into each is a copy
// that drifts. Change the number here and the site and the mail change together.
//
// Two addresses, two jobs: `SUPPORT_EMAIL` is where a customer asks for help with
// an order, `CONTACT_EMAIL` is where a vendor, partner, or journalist asks about
// the platform itself.
export const SUPPORT_EMAIL = "support@greenpackdelight.com";
export const CONTACT_EMAIL = "contact@greenpackdelight.com";

// WhatsApp, in the three shapes each consumer needs. `wa.me` takes the
// international number as bare digits with no `+` and no spaces, `tel:` takes the
// `+` and still no spaces, and a human reading the page takes the spaced form.
export const WHATSAPP_NUMBER = "2348140119893";
export const WHATSAPP_DISPLAY = "+234 814 011 9893";
export const WHATSAPP_TEL = "+2348140119893";

/**
 * A click-to-chat link. Pass a message and WhatsApp opens with it already typed
 * into the composer, which is the difference between a visitor who has to
 * describe their problem from scratch and one who only has to hit send.
 */
export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// === Payment & Delivery Constants ===
// Platform takes 3% of subtotal; vendor gets the rest via Flutterwave split.
export const PLATFORM_FEE_PERCENT = 3;
export const VENDOR_PAYOUT_PERCENT = 100 - PLATFORM_FEE_PERCENT; // 97

// Nigerian Naira amounts.
export const DELIVERY_BASE_FEE = 2000;     // ₦2,000 flat base
export const DELIVERY_RATE_PER_KM = 500;   // ₦500 per kilometre
export const DELIVERY_MIN_FEE = 2000;      // never below base
export const DELIVERY_MAX_FEE = 5000;      // cap at ₦5,000

// Currently we only serve Abuja. Cross-state blocked at checkout.
export const ALLOWED_DELIVERY_STATE = "FCT"; // also accept "Abuja"
export const ALLOWED_DELIVERY_STATE_ALIASES = [
  "fct",
  "abuja",
  "federal capital territory",
];
