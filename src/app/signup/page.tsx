"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import PasswordStrength, {
  isPasswordStrong,
} from "@/components/auth/PasswordStrength";
import OTPInput from "@/components/auth/OTPInput";

type Step = "form" | "verify-email" | "complete";
type SignupRole = "customer" | "vendor";

export default function SignUpPage() {
  const { signIn } = useAuth();
  const searchParams = useSearchParams();

  // Vendor vs customer signup is distinguished by ?role=vendor on the URL.
  // The /sell page's "Register Your Business" CTAs send users here so the
  // vendor onboarding path is visibly different from the customer one.
  const roleParam = searchParams.get("role");
  const signupRole: SignupRole = roleParam === "vendor" ? "vendor" : "customer";
  const isVendorSignup = signupRole === "vendor";

  // Allow callers to specify where to land after signup (e.g. /seller/shop).
  // Only same-origin relative paths are accepted — protects against open-redirect.
  const rawRedirect = searchParams.get("redirect");
  const redirectPath = useMemo(() => {
    if (!rawRedirect) return null;
    if (!rawRedirect.startsWith("/")) return null;
    if (rawRedirect.startsWith("//")) return null;
    return rawRedirect;
  }, [rawRedirect]);

  const defaultDestination = isVendorSignup ? "/seller/shop" : "/browse";

  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    dateOfBirth: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
    address: "",
    city: "",
    state: "",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleUseMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("This browser does not support location detection");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/geocode/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          );
          const payload = (await res.json()) as {
            success?: boolean;
            data?: {
              lat: number;
              lng: number;
              address?: string;
              city?: string;
              state?: string;
            } | null;
          };
          if (!payload.success || !payload.data) {
            setForm((prev) => ({
              ...prev,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }));
            toast.success("Coordinates captured. Please enter your address manually.");
            return;
          }
          const { address, city, state, lat, lng } = payload.data;
          setForm((prev) => ({
            ...prev,
            address: address ?? prev.address,
            city: city ?? prev.city,
            state: state ?? prev.state,
            lat,
            lng,
          }));
          toast.success("Address detected from your location");
        } catch (err) {
          console.error("Reverse geocode failed", err);
          setForm((prev) => ({
            ...prev,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }));
          toast.error("Couldn't look up your address — coordinates captured only");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please enter address manually.");
        } else {
          toast.error("Unable to determine your location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim()) {
      setError("Full name is required");
      return;
    }
    if (!form.email.trim()) {
      setError("Email address is required");
      return;
    }
    if (!form.dateOfBirth) {
      setError("Date of birth is required");
      return;
    }
    if (!isPasswordStrong(form.password)) {
      setError(
        "Password must be at least 8 characters with uppercase, lowercase, and a number"
      );
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!form.termsAccepted) {
      setError("You must accept the Terms & Conditions");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to send verification email");
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

  const handleEmailVerify = async (code: string) => {
    setError("");
    setLoading(true);

    try {
      const verifyRes = await fetch("/api/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: form.email,
          code,
          type: "email",
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        setError(verifyData.error || "Invalid code");
        setLoading(false);
        return;
      }

      const signupRes = await fetch("/api/verify/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          dateOfBirth: form.dateOfBirth,
          role: signupRole,
          address: form.address || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          lat: form.lat ?? undefined,
          lng: form.lng ?? undefined,
        }),
      });
      const signupData = await signupRes.json();

      if (!signupData.success) {
        setError(signupData.error || "Failed to create account");
        setLoading(false);
        return;
      }

      setStep("complete");
      toast.success(
        isVendorSignup
          ? "Vendor account created — let's set up your shop!"
          : "Account created successfully!"
      );

      const { error: signInError } = await signIn(form.email, form.password);
      if (signInError) {
        window.location.assign("/login");
      } else {
        window.location.assign(redirectPath ?? defaultDestination);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
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
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to resend code");
        return;
      }

      toast.success("New code sent!");
      startResendTimer();
    } catch {
      setError("Network error");
    }
  };

  const maskedEmail = form.email
    ? form.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : "";

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/profile`,
        skipBrowserRedirect: true,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
      return;
    }

    if (!data?.url) {
      setError("Google sign up is unavailable right now. Please try email signup.");
      setGoogleLoading(false);
      return;
    }

    window.location.assign(data.url);
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] dark:bg-[#122017] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="bg-green-500 p-1.5 rounded-lg">
              <span className="material-symbols-outlined text-white text-xl">
                eco
              </span>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Green Pack Delight
            </span>
          </Link>

          {step === "form" && (
            <>
              {isVendorSignup && (
                <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-500/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-4">
                  <span className="material-symbols-outlined text-sm">storefront</span>
                  Vendor Registration
                </div>
              )}
              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                {isVendorSignup ? "Create your vendor account" : "Create your account"}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {isVendorSignup
                  ? "Sign up to list your shop, sell products, and grow your business on GreenPack."
                  : "Sign up to discover shops, book services, and start shopping."}
              </p>
            </>
          )}
          {step === "verify-email" && (
            <>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                Verify your email
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                We sent a 6-digit code to{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {maskedEmail}
                </span>
              </p>
            </>
          )}
          {step === "complete" && (
            <>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                All set!
              </h1>
              <p className="text-gray-500 dark:text-gray-400">Redirecting you...</p>
            </>
          )}
        </div>

        {step !== "complete" && (
          <div className="flex items-center gap-2 mb-6 px-4">
            {(["form", "verify-email"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center flex-1 gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                    step === s
                      ? "bg-green-500 text-white"
                      : (["form", "verify-email"] as Step[]).indexOf(step) > i
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {(["form", "verify-email"] as Step[]).indexOf(step) > i ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded transition-colors ${
                      (["form", "verify-email"] as Step[]).indexOf(step) > i
                        ? "bg-green-500"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          {step === "form" && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Date of Birth
                </label>
                <input
                  type="date"
                  required
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  max={new Date(Date.now() - 13 * 365.25 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {isVendorSignup ? "Business Address" : "Delivery Address"}
                    <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">(optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locating}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-base">
                      {locating ? "progress_activity" : "my_location"}
                    </span>
                    {locating ? "Detecting..." : "Use My Location"}
                  </button>
                </div>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={
                    isVendorSignup
                      ? "Where your business is located"
                      : "Where you'd like deliveries sent"
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                  />
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="State"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                  />
                </div>
                {form.lat != null && form.lng != null && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    Location confirmed · {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 pr-16 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <PasswordStrength password={form.password} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                    className="w-full px-4 py-3 pr-16 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                )}
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.termsAccepted}
                    onChange={(e) =>
                      setForm({ ...form, termsAccepted: e.target.checked })
                    }
                    className="mt-0.5 rounded border-gray-300 text-green-500 focus:ring-green-500"
                  />
                  <span>
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="text-green-600 dark:text-green-400 hover:underline font-medium"
                      target="_blank"
                    >
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-green-600 dark:text-green-400 hover:underline font-medium"
                      target="_blank"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 cursor-pointer text-sm"
              >
                {loading ? "Sending verification..." : "Continue"}
              </button>
            </form>
          )}

          {step === "form" && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white dark:bg-gray-800 text-gray-400">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {googleLoading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                {googleLoading ? "Redirecting..." : "Continue with Google"}
              </button>
            </>
          )}

          {step === "verify-email" && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Enter the 6-digit code sent to your email
              </p>

              <OTPInput onComplete={handleEmailVerify} disabled={loading} />

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">
                    {error}
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Verifying...
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={handleResend}
                  disabled={resendCountdown > 0}
                  className="text-sm text-green-600 dark:text-green-400 font-medium hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resendCountdown > 0
                    ? `Resend code in ${resendCountdown}s`
                    : "Resend code"}
                </button>
              </div>

              <button
                onClick={() => {
                  setStep("form");
                  setError("");
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ← Back to form
              </button>
            </div>
          )}

          {step === "complete" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Account Created!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Signing you in and redirecting...
              </p>
            </div>
          )}
        </div>

        {step === "form" && (
          <div className="text-center mt-6 space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <Link
                href={
                  isVendorSignup
                    ? `/login?redirect=${encodeURIComponent(redirectPath ?? defaultDestination)}`
                    : "/login"
                }
                className="text-green-600 dark:text-green-400 font-semibold hover:underline"
              >
                Log in
              </Link>
            </p>
            {!isVendorSignup ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Want to sell or offer services?{" "}
                <Link
                  href="/sell"
                  className="text-green-600 dark:text-green-400 font-semibold hover:underline"
                >
                  Become a vendor →
                </Link>
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Just here to shop?{" "}
                <Link
                  href="/signup"
                  className="text-green-600 dark:text-green-400 font-semibold hover:underline"
                >
                  Create a customer account →
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
