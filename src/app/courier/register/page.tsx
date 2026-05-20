"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import OTPInput from "@/components/auth/OTPInput";
import PasswordStrength, { isPasswordStrong } from "@/components/auth/PasswordStrength";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "form" | "verify-email" | "submitting" | "success";

type VehicleType = "bike" | "car" | "bicycle";

interface AccountForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  termsAccepted: boolean;
}

interface CourierForm {
  vehicleType: VehicleType;
  nin: string;
  guarantorName: string;
  guarantorPhone: string;
  areaOfOperation: string;
  availabilityHours: string;
}

const EMPTY_ACCOUNT: AccountForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  dateOfBirth: "",
  termsAccepted: false,
};

const EMPTY_COURIER: CourierForm = {
  vehicleType: "bike",
  nin: "",
  guarantorName: "",
  guarantorPhone: "",
  areaOfOperation: "",
  availabilityHours: "",
};

const MAX_DOB = new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

const VEHICLES: { value: VehicleType; emoji: string }[] = [
  { value: "bike", emoji: "🏍️" },
  { value: "car", emoji: "🚗" },
  { value: "bicycle", emoji: "🚲" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CourierRegisterPage() {
  const { user, profile, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [account, setAccount] = useState<AccountForm>(EMPTY_ACCOUNT);
  const [courier, setCourier] = useState<CourierForm>(EMPTY_COURIER);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const updateCourier = (field: keyof CourierForm, value: string) =>
    setCourier((prev) => ({ ...prev, [field]: value }));

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

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateCourier = (): string | null => {
    if (!/^\d{11}$/.test(courier.nin.trim()))
      return "NIN must be exactly 11 digits.";
    if (!courier.guarantorName.trim()) return "Guarantor name is required.";
    if (courier.guarantorPhone.replace(/\D/g, "").length < 10)
      return "Enter a valid guarantor phone number.";
    return null;
  };

  const validateAccount = (): string | null => {
    if (!account.fullName.trim()) return "Full name is required.";
    if (!account.email.trim()) return "Email address is required.";
    if (account.phone.replace(/\D/g, "").length < 10)
      return "Enter a valid phone number — couriers receive job alerts by SMS.";
    if (!account.dateOfBirth) return "Date of birth is required.";
    if (!isPasswordStrong(account.password))
      return "Password must be at least 8 characters with uppercase, lowercase, and a number.";
    if (account.password !== account.confirmPassword)
      return "Passwords do not match.";
    if (!account.termsAccepted)
      return "You must accept the Terms & Conditions.";
    return null;
  };

  const courierApiPayload = () => ({
    vehicle_type: courier.vehicleType,
    nin: courier.nin.trim(),
    guarantor_name: courier.guarantorName.trim(),
    guarantor_phone: courier.guarantorPhone.trim(),
    area_of_operation: courier.areaOfOperation.trim(),
    availability_hours: courier.availabilityHours.trim(),
  });

  // ── Submit: signed-in user → existing apply endpoint ───────────────────────

  const handleSignedInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const courierErr = validateCourier();
    if (courierErr) {
      setError(courierErr);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/couriers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(courierApiPayload()),
      });

      let payload: { success?: boolean; error?: unknown } = {};
      try {
        payload = await res.json();
      } catch {
        /* non-JSON */
      }

      if (!res.ok || !payload.success) {
        const errMsg =
          typeof payload.error === "string"
            ? payload.error
            : payload.error
              ? JSON.stringify(payload.error)
              : `Application failed (status ${res.status})`;
        throw new Error(errMsg);
      }

      setStep("success");
    } catch (err) {
      console.error("Courier apply error:", err);
      setError(
        err instanceof Error ? err.message : "Application failed. Please try again."
      );
      setLoading(false);
    }
  };

  // ── Submit: signed-out user — step 1 (send OTP) ────────────────────────────

  const handleSignedOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const accountErr = validateAccount();
    if (accountErr) {
      setError(accountErr);
      return;
    }
    const courierErr = validateCourier();
    if (courierErr) {
      setError(courierErr);
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

  // ── Submit: signed-out user — step 2 (OTP → register) ──────────────────────

  const handleOTPVerify = async (code: string) => {
    setError("");
    setLoading(true);
    setStep("submitting");

    try {
      const res = await fetch("/api/courier/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: {
            email: account.email,
            password: account.password,
            fullName: account.fullName,
            dateOfBirth: account.dateOfBirth,
            phone: account.phone.trim(),
            otp: code,
          },
          courier: courierApiPayload(),
        }),
      });

      let data: { success?: boolean; error?: unknown } = {};
      try {
        data = await res.json();
      } catch {
        /* non-JSON */
      }

      if (res.status === 409) {
        toast.error("An account with this email already exists.");
        setError("An account with this email already exists. Please sign in instead.");
        setStep("form");
        setLoading(false);
        return;
      }

      if (res.status === 401) {
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

      setStep("success");
    } catch (err) {
      console.error("Courier register error:", err);
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

  // ── Render: success ────────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎉</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">
            Application Submitted!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Thank you for applying to be a GreenPack courier.
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            We&apos;ll review your application and contact you within{" "}
            <strong>24 hours</strong> via phone or WhatsApp.
          </p>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-8 text-left">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
              What happens next?
            </p>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>Our team reviews your application</li>
              <li>We verify your NIN and guarantor details</li>
              <li>Brief phone interview</li>
              <li>Account activated — start earning!</li>
            </ol>
          </div>
          <Link
            href="/"
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            Back to Home
          </Link>
        </div>
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
                {step === "submitting" ? "Creating your account and application..." : "Verifying..."}
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
            <span className="material-symbols-outlined text-sm">local_shipping</span>
            Courier Registration
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
            Become a GreenPack Courier
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Apply in minutes and start earning on your own schedule.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6" autoComplete="off">
          {/* ── Account section ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
              Your Account
            </h2>

            {isSignedIn ? (
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 mt-0.5">
                  verified_user
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Applying as:{" "}
                    <span className="font-bold">{profile?.full_name || user.email}</span>
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                    Your courier application will be linked to this account.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    name="courier-full-name"
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
                    name="courier-email"
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
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    autoComplete="off"
                    name="courier-phone"
                    value={account.phone}
                    onChange={(e) =>
                      setAccount((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+234 801 234 5678"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-colors"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Job alerts are sent to this number by SMS.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    autoComplete="off"
                    name="courier-dob"
                    value={account.dateOfBirth}
                    max={MAX_DOB}
                    onChange={(e) =>
                      setAccount((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-colors"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    You must be at least 18 to be a courier.
                  </p>
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
                      name="courier-password"
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
                      name="courier-confirm-password"
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
                        setAccount((prev) => ({ ...prev, termsAccepted: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-gray-300 text-green-500 focus:ring-green-500"
                    />
                    <span>
                      I agree to the{" "}
                      <Link href="/terms" className="text-green-600 dark:text-green-400 hover:underline font-medium" target="_blank" rel="noopener noreferrer">
                        Terms &amp; Conditions
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-green-600 dark:text-green-400 hover:underline font-medium" target="_blank" rel="noopener noreferrer">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ── Courier details ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
              Courier Details
            </h2>
            <div className="space-y-5">
              {/* Vehicle type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vehicle Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {VEHICLES.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => updateCourier("vehicleType", v.value)}
                      className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors capitalize ${
                        courier.vehicleType === v.value
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {v.emoji} {v.value}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                id="courierNin"
                label="NIN (National Identification Number)"
                required
                autoComplete="off"
                name="courier-nin"
                inputMode="numeric"
                maxLength={11}
                value={courier.nin}
                onChange={(e) => updateCourier("nin", e.target.value.replace(/\D/g, ""))}
                placeholder="Enter your 11-digit NIN"
              />

              <Input
                id="guarantorName"
                label="Guarantor Full Name"
                required
                autoComplete="off"
                name="courier-guarantor-name"
                value={courier.guarantorName}
                onChange={(e) => updateCourier("guarantorName", e.target.value)}
                placeholder="Full name of your guarantor"
              />

              <Input
                id="guarantorPhone"
                label="Guarantor Phone Number"
                type="tel"
                required
                autoComplete="off"
                name="courier-guarantor-phone"
                value={courier.guarantorPhone}
                onChange={(e) => updateCourier("guarantorPhone", e.target.value)}
                placeholder="+234 800 000 0000"
              />

              <Input
                id="areaOfOperation"
                label="Area of Operation (Optional)"
                autoComplete="off"
                name="courier-area"
                value={courier.areaOfOperation}
                onChange={(e) => updateCourier("areaOfOperation", e.target.value)}
                placeholder="e.g. Lekki, Lagos Island, Surulere"
              />

              <Input
                id="availabilityHours"
                label="Preferred Availability Hours (Optional)"
                autoComplete="off"
                name="courier-availability"
                value={courier.availabilityHours}
                onChange={(e) => updateCourier("availabilityHours", e.target.value)}
                placeholder="e.g. Weekdays 8am–6pm"
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
                {isSignedIn ? "Submitting application..." : "Sending verification..."}
              </span>
            ) : isSignedIn ? (
              "Submit Application"
            ) : (
              "Continue to Verification"
            )}
          </Button>
        </form>

        {/* ── Bottom link ── */}
        <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login?redirect=/courier/register"
            className="text-green-600 dark:text-green-400 font-semibold hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
