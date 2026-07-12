"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import OTPInput from "@/components/auth/OTPInput";
import PasswordStrength, { isPasswordStrong } from "@/components/auth/PasswordStrength";
import { categories } from "@/lib/data/categories";
import AddressAutocomplete, {
  type ResolvedAddress,
} from "@/components/ui/AddressAutocomplete";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "form" | "verify-email" | "submitting";

interface AccountForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  termsAccepted: boolean;
}

interface ShopForm {
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  address: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  gpsAccuracy: number | null;
  phone: string;
  email: string;
  whatsapp: string;
  openTime: string;
  closeTime: string;
  days: string;
}

const EMPTY_ACCOUNT: AccountForm = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  dateOfBirth: "",
  termsAccepted: false,
};

const EMPTY_SHOP: ShopForm = {
  name: "",
  slug: "",
  categoryId: "",
  categoryName: "",
  address: "",
  city: "",
  state: "",
  lat: null,
  lng: null,
  gpsAccuracy: null,
  phone: "",
  email: "",
  whatsapp: "",
  openTime: "",
  closeTime: "",
  days: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a URL-safe slug from a shop name. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const MAX_DOB = new Date(Date.now() - 13 * 365.25 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VendorRegisterPage() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [switching, setSwitching] = useState(false);

  // "Switch account" must sign the CURRENT user out before sending them to the
  // vendor login. Linking straight to /login fails silently: middleware
  // redirects already-signed-in users away from /login back to their role's
  // home (customers → /browse), so the customer would just bounce back to
  // browse instead of getting a chance to log in as a different account.
  const handleSwitchAccount = async () => {
    setSwitching(true);
    try {
      await signOut();
    } finally {
      window.location.assign("/login?mode=vendor&redirect=/vendor/register");
    }
  };

  const [step, setStep] = useState<Step>("form");
  const [account, setAccount] = useState<AccountForm>(EMPTY_ACCOUNT);
  const [shop, setShop] = useState<ShopForm>(EMPTY_SHOP);
  const [slugTouched, setSlugTouched] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const updateShop = (field: keyof ShopForm, value: string) =>
    setShop((prev) => ({ ...prev, [field]: value }));

  const startResendTimer = useCallback(() => {
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Address autocomplete ─────────────────────────────────────────────────

  // Selecting a suggestion in the AddressAutocomplete fills the address fields
  // and pins precise coords — no device GPS, no separate "find on map" step.
  const handleAddressResolved = (r: ResolvedAddress) => {
    setShop((prev) => ({
      ...prev,
      address: r.address || prev.address,
      city: r.city ?? prev.city,
      state: r.state ?? prev.state,
      lat: r.lat,
      lng: r.lng,
      gpsAccuracy: null,
    }));
  };

  // ── Validation helpers ─────────────────────────────────────────────────────

  const validateShop = (): string | null => {
    if (!shop.name.trim()) return "Shop name is required.";
    if (!shop.slug.trim() || !/^[a-z0-9-]+$/.test(shop.slug.trim()))
      return "Slug must use lowercase letters, numbers, and dashes only.";
    if (!shop.categoryId) return "Please select a category.";
    if (!shop.address.trim()) return "Street address is required.";
    if (!shop.city.trim()) return "City is required.";
    if (!shop.state.trim()) return "State is required.";
    if (!shop.phone.trim()) return "Phone number is required.";
    if (!shop.email.trim()) return "Contact email is required.";
    return null;
  };

  const validateAccount = (): string | null => {
    if (!account.fullName.trim()) return "Full name is required.";
    if (!account.email.trim()) return "Email address is required.";
    if (!account.dateOfBirth) return "Date of birth is required.";
    if (!isPasswordStrong(account.password))
      return "Password must be at least 8 characters with uppercase, lowercase, and a number.";
    if (account.password !== account.confirmPassword) return "Passwords do not match.";
    if (!account.termsAccepted) return "You must accept the Terms & Conditions.";
    return null;
  };

  // ── Submit: signed-in user ─────────────────────────────────────────────────

  const handleSignedInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const shopErr = validateShop();
    if (shopErr) {
      setError(shopErr);
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: shop.name.trim(),
        slug: shop.slug.trim(),
        category_id: shop.categoryId,
        category_name: shop.categoryName,
        location: {
          address: shop.address.trim(),
          city: shop.city.trim(),
          state: shop.state.trim(),
        },
        contact: {
          phone: shop.phone.trim(),
          email: shop.email.trim(),
          whatsapp: shop.whatsapp.trim(),
        },
        hours: {
          open: shop.openTime.trim(),
          close: shop.closeTime.trim(),
          days: shop.days.trim(),
        },
      };
      if (shop.lat != null && Number.isFinite(shop.lat)) body.lat = shop.lat;
      if (shop.lng != null && Number.isFinite(shop.lng)) body.lng = shop.lng;

      const res = await fetch("/api/seller/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      let payload: { success?: boolean; error?: unknown } = {};
      try {
        payload = await res.json();
      } catch {
        /* non-JSON */
      }

      if (res.status === 409) {
        toast.error(
          () => (
            <span>
              You already have a shop.{" "}
              <a href="/seller/shop" className="underline font-semibold">
                Edit your shop
              </a>
            </span>
          ),
          { duration: 8000 }
        );
        setLoading(false);
        return;
      }

      if (!res.ok || !payload.success) {
        const errMsg =
          typeof payload.error === "string"
            ? payload.error
            : payload.error
              ? JSON.stringify(payload.error)
              : `Failed to create shop (status ${res.status})`;
        throw new Error(errMsg);
      }

      toast.success("Shop created! Redirecting to your dashboard...");
      window.location.assign("/seller/dashboard");
    } catch (err) {
      console.error("Create shop error:", err);
      setError(err instanceof Error ? err.message : "Failed to create shop. Please try again.");
      setLoading(false);
    }
  };

  // ── Submit: signed-out user — step 1 (send OTP) ───────────────────────────

  const handleSignedOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const accountErr = validateAccount();
    if (accountErr) {
      setError(accountErr);
      return;
    }

    const shopErr = validateShop();
    if (shopErr) {
      setError(shopErr);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to send verification email. Please try again.");
        return;
      }

      setStep("verify-email");
      startResendTimer();
      toast.success("Verification code sent to your email!");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Submit: signed-out user — step 2 (OTP → register) ────────────────────

  const handleOTPVerify = async (code: string) => {
    setError("");
    setLoading(true);
    setStep("submitting");

    try {
      const res = await fetch("/api/vendor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: {
            email: account.email,
            password: account.password,
            fullName: account.fullName,
            dateOfBirth: account.dateOfBirth,
            phone: shop.phone.trim(),
            otp: code,
          },
          shop: {
            name: shop.name.trim(),
            slug: shop.slug.trim(),
            category_id: shop.categoryId,
            category_name: shop.categoryName,
            location: {
              address: shop.address.trim(),
              city: shop.city.trim(),
              state: shop.state.trim(),
            },
            contact: {
              phone: shop.phone.trim(),
              email: shop.email.trim(),
              whatsapp: shop.whatsapp.trim(),
            },
            hours: {
              open: shop.openTime.trim(),
              close: shop.closeTime.trim(),
              days: shop.days.trim(),
            },
            lat: shop.lat ?? undefined,
            lng: shop.lng ?? undefined,
          },
        }),
      });

      let data: { success?: boolean; redirect?: string; error?: unknown } = {};
      try {
        data = await res.json();
      } catch {
        /* non-JSON */
      }

      if (res.status === 409) {
        // Email already registered
        toast.error("An account with this email already exists.");
        setError("An account with this email already exists.");
        setStep("form");
        setLoading(false);
        return;
      }

      if (res.status === 401) {
        // Invalid OTP — go back to OTP step so user can re-enter
        setError("Invalid or expired code. Please check your email and try again.");
        setStep("verify-email");
        setLoading(false);
        return;
      }

      if (!res.ok || !data.success) {
        const errMsg =
          typeof data.error === "string"
            ? data.error
            : data.error
              ? JSON.stringify(data.error)
              : `Registration failed (status ${res.status})`;
        throw new Error(errMsg);
      }

      toast.success("Account and shop created! Redirecting...");
      window.location.assign(data.redirect ?? "/seller/dashboard");
    } catch (err) {
      console.error("Vendor register error:", err);
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
      setStep("verify-email");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setError("");
    try {
      const res = await fetch("/api/verify/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to resend code.");
        return;
      }
      toast.success("New code sent!");
      startResendTimer();
    } catch {
      setError("Network error.");
    }
  };

  const maskedEmail = account.email
    ? account.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : "";

  // ── Render: auth loading ───────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f6f8f7] dark:bg-gray-900 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-green-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // ── Render: OTP step ───────────────────────────────────────────────────────

  if (step === "verify-email" || step === "submitting") {
    return (
      <div className="min-h-screen bg-[#f6f8f7] dark:bg-gray-900 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="bg-green-500 p-1.5 rounded-lg">
                <span className="material-symbols-outlined text-white text-xl">eco</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Green Pack Delight
              </span>
            </Link>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
              Verify your email
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Enter the 6-digit code we sent to{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {maskedEmail}
              </span>
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Enter the 6-digit code sent to your email
            </p>

            <OTPInput onComplete={handleOTPVerify} disabled={loading} />

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {step === "submitting" ? "Creating your account and shop..." : "Verifying..."}
              </div>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCountdown > 0 || loading}
                className="text-sm text-green-600 dark:text-green-400 font-medium hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
              >
                {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend code"}
              </button>
            </div>

            {!loading && (
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setError("");
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ← Back to form
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: main form ──────────────────────────────────────────────────────

  const isSignedIn = !!user;
  const onSubmit = isSignedIn ? handleSignedInSubmit : handleSignedOutSubmit;

  return (
    <div className="min-h-screen bg-[#f6f8f7] dark:bg-gray-900 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="bg-green-500 p-1.5 rounded-lg">
              <span className="material-symbols-outlined text-white text-xl">eco</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Green Pack Delight
            </span>
          </Link>
          <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-500/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-4">
            <span className="material-symbols-outlined text-sm">storefront</span>
            Vendor Registration
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
            Register Your Business
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Join GreenPack and start selling in minutes.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6" autoComplete="off">
          {/* ── Account section ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
              Your Account
            </h2>

            {isSignedIn ? (
              /* Signed-in: show identity card */
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 mt-0.5">
                  verified_user
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Registering as:{" "}
                    <span className="font-bold">{user.email}</span>
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                    Your shop will be linked to this account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  disabled={switching}
                  className="text-xs text-green-700 dark:text-green-400 underline hover:no-underline whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {switching ? "Switching…" : "Switch account"}
                </button>
              </div>
            ) : (
              /* Signed-out: account fields */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    name="vendor-full-name"
                    value={account.fullName}
                    onChange={(e) =>
                      setAccount((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    placeholder="Enter your full name"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    name="vendor-email"
                    value={account.email}
                    onChange={(e) =>
                      setAccount((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    autoComplete="off"
                    name="vendor-dob"
                    value={account.dateOfBirth}
                    max={MAX_DOB}
                    onChange={(e) =>
                      setAccount((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      name="vendor-password"
                      value={account.password}
                      onChange={(e) =>
                        setAccount((prev) => ({ ...prev, password: e.target.value }))
                      }
                      placeholder="Create a strong password"
                      className="w-full px-4 py-2.5 pr-16 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-700"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <PasswordStrength password={account.password} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      name="vendor-confirm-password"
                      value={account.confirmPassword}
                      onChange={(e) =>
                        setAccount((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Re-enter your password"
                      className="w-full px-4 py-2.5 pr-16 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-700"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {account.confirmPassword &&
                    account.password !== account.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>
                    )}
                </div>

                <div className="pt-1">
                  <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={account.termsAccepted}
                      onChange={(e) =>
                        setAccount((prev) => ({
                          ...prev,
                          termsAccepted: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded border-gray-300 text-green-500 focus:ring-green-500"
                    />
                    <span>
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        className="text-green-600 dark:text-green-400 hover:underline font-medium"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Terms &amp; Conditions
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="text-green-600 dark:text-green-400 hover:underline font-medium"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ── Shop info ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
              Shop Information
            </h2>
            <div className="space-y-4">
              <Input
                id="shopName"
                label="Shop Name"
                placeholder="e.g. Bella's Fashion House"
                required
                autoComplete="off"
                name="vendor-shop-name"
                value={shop.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  setShop((prev) => ({
                    ...prev,
                    name: newName,
                    // Auto-generate slug from name only if user hasn't manually edited it yet
                    slug: slugTouched ? prev.slug : slugify(newName),
                  }));
                }}
              />
              <div>
                <Input
                  id="shopSlug"
                  label="URL Slug"
                  required
                  autoComplete="off"
                  name="vendor-shop-slug"
                  value={shop.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    updateShop("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                  placeholder="my-shop-name"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Lowercase letters, numbers, and dashes only.
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  required
                  value={shop.categoryId}
                  onChange={(e) => {
                    const cat = categories.find((c) => c.id === e.target.value);
                    setShop((prev) => ({
                      ...prev,
                      categoryId: cat?.id ?? "",
                      categoryName: cat?.name ?? "",
                    }));
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Location ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Location
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Couriers calculate distance from the exact pin — please verify your location.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <AddressAutocomplete
                id="vendorAddress"
                name="vendor-street-address"
                label="Street Address"
                required
                placeholder="Start typing your business address…"
                value={shop.address}
                resolved={shop.lat != null && shop.lng != null}
                onChange={(value) => updateShop("address", value)}
                onClearResolved={() =>
                  setShop((prev) =>
                    prev.lat == null && prev.lng == null
                      ? prev
                      : { ...prev, lat: null, lng: null, gpsAccuracy: null }
                  )
                }
                onResolve={handleAddressResolved}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="vendorCity"
                  label="City"
                  placeholder="e.g. Abuja"
                  required
                  autoComplete="off"
                  name="vendor-city"
                  value={shop.city}
                  onChange={(e) => updateShop("city", e.target.value)}
                />
                <Input
                  id="vendorState"
                  label="State"
                  placeholder="e.g. FCT"
                  required
                  autoComplete="off"
                  name="vendor-state"
                  value={shop.state}
                  onChange={(e) => updateShop("state", e.target.value)}
                />
              </div>

              {/* GPS confirmation badge */}
              {shop.lat != null && shop.lng != null && (
                <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 font-medium flex-wrap">
                  <span className="material-symbols-outlined text-base">location_on</span>
                  <span>
                    GPS pin: {shop.lat.toFixed(4)}, {shop.lng.toFixed(4)}
                    {shop.gpsAccuracy != null && ` — accuracy ±${shop.gpsAccuracy} m`}
                  </span>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${shop.lat}&mlon=${shop.lng}#map=17/${shop.lat}/${shop.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline ml-1"
                  >
                    View on map ↗
                  </a>
                </div>
              )}
              {(shop.lat == null || shop.lng == null) && shop.address.trim() && (
                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">warning</span>
                  No GPS pin yet — couriers may estimate distance approximately.
                </span>
              )}
            </div>
          </div>

          {/* ── Contact info ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
              Contact Information
            </h2>
            <div className="space-y-4">
              <Input
                id="shopPhone"
                label="Phone"
                type="tel"
                required
                autoComplete="off"
                name="vendor-phone"
                value={shop.phone}
                onChange={(e) => updateShop("phone", e.target.value)}
                placeholder="+234 801 234 5678"
              />
              <Input
                id="shopContactEmail"
                label="Contact Email"
                type="email"
                required
                autoComplete="off"
                name="vendor-contact-email"
                value={shop.email}
                onChange={(e) => updateShop("email", e.target.value)}
                placeholder="shop@example.com"
              />
              <Input
                id="shopWhatsapp"
                label="WhatsApp (Optional)"
                type="tel"
                autoComplete="off"
                name="vendor-whatsapp"
                value={shop.whatsapp}
                onChange={(e) => updateShop("whatsapp", e.target.value)}
                placeholder="+234 801 234 5678"
              />
            </div>
          </div>

          {/* ── Business hours (optional) ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Business Hours
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              Optional — you can fill this in from your dashboard later.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="openTime"
                  label="Opening Time"
                  type="time"
                  autoComplete="off"
                  value={shop.openTime}
                  onChange={(e) => updateShop("openTime", e.target.value)}
                />
                <Input
                  id="closeTime"
                  label="Closing Time"
                  type="time"
                  autoComplete="off"
                  value={shop.closeTime}
                  onChange={(e) => updateShop("closeTime", e.target.value)}
                />
              </div>
              <Input
                id="days"
                label="Working Days"
                autoComplete="off"
                placeholder="e.g. Monday – Saturday"
                value={shop.days}
                onChange={(e) => updateShop("days", e.target.value)}
              />
            </div>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* ── Submit ── */}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isSignedIn ? "Creating shop..." : "Sending verification..."}
              </span>
            ) : isSignedIn ? (
              "Create My Shop"
            ) : (
              "Continue to Verification"
            )}
          </Button>
        </form>

        {/* ── Bottom link ── */}
        <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login?mode=vendor&redirect=/seller/dashboard"
            className="text-green-600 dark:text-green-400 font-semibold hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
