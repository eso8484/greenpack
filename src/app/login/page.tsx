"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import OTPInput from "@/components/auth/OTPInput";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

type LoginMethod = "email" | "phone";
type LoginStage = "credentials" | "otp";

const RESET_EMAIL_COOLDOWN_MS = 60000;

function getFriendlyResetError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("email rate limit exceeded") || normalized.includes("over_email_send_rate_limit")) {
    return "Supabase email sending limit has been reached for this project. This limit applies project-wide (not per email). Please wait and try again later, or configure custom SMTP and increase Auth rate limits.";
  }

  if (normalized.includes("security purposes") && normalized.includes("60")) {
    return "Please wait about 60 seconds before requesting another reset link for this account.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Password reset is currently rate-limited by Supabase. This can be per-user, per-IP, or project-wide depending on your Auth setup.";
  }
  return message;
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [method, setMethod] = useState<LoginMethod>("email");
  const [form, setForm] = useState({ email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotCooldownUntil, setForgotCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // OTP gate: when email login is used, we collect creds, validate them
  // server-side, send a 6-digit code, then require the code before the
  // session is created. Phone login (uses phone→email lookup) and Google
  // OAuth bypass this gate by design.
  const [stage, setStage] = useState<LoginStage>("credentials");
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);

  const rawRedirect = searchParams.get("redirect");
  // Only honor same-origin relative paths. Reject absolute URLs and
  // protocol-relative (`//evil.com`) to prevent open-redirect phishing.
  const redirect =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : null;

  // Detect vendor intent so the page's signup links keep the user on the
  // vendor path instead of bouncing them back to /sell (which used to create
  // a loop: /sell → /seller/onboarding → /signup → /login → /sell).
  const isVendorIntent = redirect?.startsWith("/seller") ?? false;
  const signupHref = isVendorIntent
    ? `/signup?role=vendor&redirect=${encodeURIComponent(redirect ?? "/seller/shop")}`
    : "/signup";
  const vendorSignupHref = `/signup?role=vendor&redirect=${encodeURIComponent(redirect && isVendorIntent ? redirect : "/seller/shop")}`;
  const forgotMode = searchParams.get("forgot") === "1";
  const forgotEmailFromQuery = searchParams.get("email") ?? "";

  const forgotSecondsLeft = forgotCooldownUntil
    ? Math.max(0, Math.ceil((forgotCooldownUntil - now) / 1000))
    : 0;

  useEffect(() => {
    if (!forgotMode) return;
    setShowForgot(true);
    if (forgotEmailFromQuery) {
      setForgotEmail(forgotEmailFromQuery);
    }
  }, [forgotMode, forgotEmailFromQuery]);

  useEffect(() => {
    if (!forgotCooldownUntil) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [forgotCooldownUntil]);

  const startResendTimer = () => {
    setOtpResendCountdown(60);
    const interval = setInterval(() => {
      setOtpResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    let loginEmail = form.email;

    if (method === "phone") {
      try {
        const res = await fetch("/api/verify/phone-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: form.phone }),
        });
        const data = await res.json();
        if (!data.success || !data.email) {
          setError("No account found with this phone number");
          setLoading(false);
          return;
        }
        loginEmail = data.email;
      } catch {
        setError("Network error. Please try again.");
        setLoading(false);
        return;
      }
    }

    if (method === "email") {
      // OTP gate: validate password server-side and send a verification code.
      // The session is NOT created here — that happens after OTP verification
      // so browser-autofilled credentials can't grant access without the
      // user proving control of the inbox.
      try {
        const res = await fetch("/api/auth/email-otp/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || "Could not start OTP login");
          setLoading(false);
          return;
        }
        setOtpEmail(loginEmail);
        setStage("otp");
        startResendTimer();
        toast.success(`We sent a code to ${loginEmail}`);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Phone login keeps its existing single-step flow.
    const { error: signInError, role } = await signIn(loginEmail, form.password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");

    let target = "/browse";
    if (redirect) target = redirect;
    else if (role === "vendor") target = "/seller/dashboard";
    else if (role === "courier") target = "/courier/dashboard";
    else if (role === "admin") target = "/admin";

    window.location.assign(target);
  };

  const handleOTPVerify = async (code: string) => {
    if (!otpEmail) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email-otp/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpEmail,
          password: form.password,
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Invalid code");
        setLoading(false);
        return;
      }

      toast.success("Welcome back!");

      let target = "/browse";
      if (redirect) target = redirect;
      else if (data.role === "vendor") target = "/seller/dashboard";
      else if (data.role === "courier") target = "/courier/dashboard";
      else if (data.role === "admin") target = "/admin";

      // Hard redirect so server-side cookies are picked up on the next page.
      window.location.assign(target);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleOTPResend = async () => {
    if (otpResendCountdown > 0 || !otpEmail) return;
    setError("");
    try {
      const res = await fetch("/api/auth/email-otp/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Could not resend code");
        return;
      }
      toast.success("New code sent");
      startResendTimer();
    } catch {
      setError("Network error");
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${redirect ?? "/browse"}`,
        skipBrowserRedirect: true,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
      return;
    }

    if (!data?.url) {
      setError("Google sign in is unavailable right now. Please sign in with email.");
      setGoogleLoading(false);
      return;
    }

    window.location.assign(data.url);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || forgotSecondsLeft > 0) return;
    setForgotLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      setError(getFriendlyResetError(error.message));
      if (error.message.toLowerCase().includes("rate limit") || error.message.toLowerCase().includes("too many")) {
        setForgotCooldownUntil(Date.now() + RESET_EMAIL_COOLDOWN_MS);
      }
    } else {
      setForgotSent(true);
      setForgotCooldownUntil(Date.now() + RESET_EMAIL_COOLDOWN_MS);
    }
  };

  // ─── Forgot password modal ───────────────────────────────────────────────────
  if (showForgot) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Reset your password
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-8">
            {forgotSent ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-semibold">Check your inbox</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  We sent a password reset link to <span className="font-semibold">{forgotEmail}</span>
                </p>
                <button
                  onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}
                  className="text-sm text-green-600 dark:text-green-400 font-medium hover:underline"
                >
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <Input
                  id="forgot-email"
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={forgotLoading}>
                  {forgotLoading
                    ? "Sending..."
                    : forgotSecondsLeft > 0
                      ? `Try again in ${forgotSecondsLeft}s`
                      : "Send Reset Link"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setError(""); }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ← Back to sign in
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Main login page ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Image
              src="/logo.png"
              alt="Green Pack Delight"
              width={48}
              height={48}
              className="rounded-full"
              unoptimized
            />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              Green<span className="text-green-500">Pack</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {stage === "otp" ? "Verify it's you" : "Welcome back"}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {stage === "otp"
              ? `We sent a 6-digit code to ${otpEmail ?? "your email"}`
              : "Sign in to your account"}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-8">
          {stage === "otp" ? (
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
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Enter the 6-digit code from your email. Browser-saved
                passwords alone cannot complete this step.
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
                  Verifying...
                </div>
              )}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleOTPResend}
                  disabled={otpResendCountdown > 0}
                  className="text-sm text-green-600 dark:text-green-400 font-medium hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {otpResendCountdown > 0
                    ? `Resend code in ${otpResendCountdown}s`
                    : "Resend code"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStage("credentials");
                  setError("");
                  setOtpEmail(null);
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ← Use a different account
              </button>
            </div>
          ) : (
            <>
          {/* Login method toggle */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMethod("email"); setError(""); }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                method === "email"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => { setMethod("phone"); setError(""); }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                method === "phone"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              Phone
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {method === "email" ? (
              <Input
                id="email"
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium shrink-0">
                    <span className="mr-1.5">🇳🇬</span> +234
                  </div>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setForm({ ...form, phone: val });
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                    placeholder="801 234 5678"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="w-full px-4 py-3 pr-16 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => { setShowForgot(true); setError(""); }}
                className="text-green-600 hover:text-green-700 dark:text-green-400 font-medium"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white dark:bg-gray-800 text-gray-400">or</span>
            </div>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
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
        </div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{" "}
          <Link href={signupHref} className="text-green-600 hover:text-green-700 dark:text-green-400 font-semibold">
            Create account
          </Link>
        </p>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Want to sell on GreenPack?{" "}
          <Link
            href={vendorSignupHref}
            className="text-green-600 hover:text-green-700 dark:text-green-400 font-semibold"
          >
            Register your shop
          </Link>
        </p>
      </div>
    </div>
  );
}
