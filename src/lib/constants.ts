export const SITE_NAME = "GreenPack";
export const SITE_DESCRIPTION =
  "Discover local shops and services near you";
export const CURRENCY = "NGN";
export const CURRENCY_SYMBOL = "₦";
export const ITEMS_PER_PAGE = 12;

// === Payment & Delivery Constants ===
// Platform takes 3% of subtotal; vendor gets the rest via Paystack subaccount.
export const PLATFORM_FEE_PERCENT = 3;
export const VENDOR_PAYOUT_PERCENT = 100 - PLATFORM_FEE_PERCENT; // 97

// Nigerian Naira amounts (NOT kobo). Convert to kobo at Paystack boundary.
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

// Paystack
export const PAYSTACK_BASE_URL = "https://api.paystack.co";
