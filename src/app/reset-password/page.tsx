"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthBackdrop from "@/components/auth/AuthBackdrop";
import { createClient } from "@/lib/supabase/client";

type RecoveryStatus = "verifying" | "ready" | "success" | "error";

const RECOVERY_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function isRecoveryType(value: string | null): value is "recovery" {
  return value === "recovery";
}

function getRecoveryErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("expired") || message.includes("invalid")) {
    return "This reset link is invalid or expired. Please request a new one.";
  }
  if (message.includes("code verifier") || message.includes("pkce") || message.includes("both auth code and code verifier")) {
    return "This reset link must be opened in the same browser where you requested it. Please request a new link and open it here.";
  }
  if (message.includes("timed out") || message.includes("timeout")) {
    return "Validation timed out. Please request a new reset link and try again.";
  }
  return "This reset link is invalid, expired, or timed out. Please request a new one.";
}

/**
 * Password-reset landing page (traditional flow).
 *
 * The emailed link (from /api/auth/reset/request) establishes a recovery
 * session when opened. We then show a "set a new password" form; on submit we
 * update the password, sign the recovery session out, and send the user to
 * /login so they sign in fresh with the NEW password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [status, setStatus] = useState<RecoveryStatus>("verifying");
  const [statusMessage, setStatusMessage] = useState("Validating your password reset link…");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (status !== "verifying") return;
    const watchdog = setTimeout(() => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      setStatus("error");
      setStatusMessage("We couldn't validate this link in time. Please request a new reset link.");
    }, RECOVERY_TIMEOUT_MS + 1000);
    return () => clearTimeout(watchdog);
  }, [status]);

  useEffect(() => {
    const activate = async () => {
      const resolveReady = () => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        setStatus("ready");
        setStatusMessage("Set a new password for your account.");
      };
      const resolveError = (message: string) => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        setStatus("error");
        setStatusMessage(message);
      };

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
          resolveReady();
        }
      });

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const queryType = url.searchParams.get("type");
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hashType = hashParams.get("type");

        const hasSession = async () => {
          const { data } = await withTimeout(supabase.auth.getSession(), RECOVERY_TIMEOUT_MS, "Session check timed out");
          return Boolean(data.session?.user);
        };

        let recovered = await hasSession();

        if (!recovered && code) {
          const { error } = await withTimeout(
            supabase.auth.exchangeCodeForSession(code),
            RECOVERY_TIMEOUT_MS,
            "Recovery link validation timed out"
          );
          if (error && !(await hasSession())) throw error;
          recovered = true;
        } else if (!recovered && accessToken && refreshToken && isRecoveryType(hashType)) {
          const { error } = await withTimeout(
            supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }),
            RECOVERY_TIMEOUT_MS,
            "Recovery session setup timed out"
          );
          if (error && !(await hasSession())) throw error;
          recovered = true;
        } else if (!recovered && tokenHash && isRecoveryType(queryType)) {
          const { error } = await withTimeout(
            supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }),
            RECOVERY_TIMEOUT_MS,
            "Recovery OTP validation timed out"
          );
          if (error && !(await hasSession())) throw error;
          recovered = true;
        }

        if (!recovered) {
          resolveError("This reset link is invalid or expired. Please request a new one.");
          return;
        }

        url.searchParams.delete("code");
        url.searchParams.delete("type");
        url.searchParams.delete("token_hash");
        window.history.replaceState({}, "", url.pathname);
        resolveReady();
      } catch (error) {
        resolveError(getRecoveryErrorMessage(error));
      } finally {
        subscription.unsubscribe();
      }
    };

    activate();
  }, [supabase]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSubmitting(false);
      setFormError(error.message);
      return;
    }

    // End the recovery session so the user signs in fresh with the NEW
    // password (matches the expectation: "then I log in with my new password").
    await supabase.auth.signOut();
    setSubmitting(false);
    setStatus("success");
    setStatusMessage("Password updated. Please sign in with your new password.");
    toast.success("Password updated successfully");
  };

  if (status === "verifying") {
    return (
      <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 overflow-hidden">
        <AuthBackdrop />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          <p className="mt-4 text-gray-700 dark:text-gray-300">{statusMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 overflow-hidden">
      <AuthBackdrop />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset your password</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{statusMessage}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-8">
          {status === "ready" && (
            <form onSubmit={onSubmit} className="space-y-5">
              <Input
                id="new-password"
                label="New Password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                id="confirm-password"
                label="Confirm Password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Updating…" : "Update Password"}
              </Button>
            </form>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <Button size="lg" className="w-full" onClick={() => router.push("/login")}>Sign In</Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <Button size="lg" className="w-full" onClick={() => router.push("/login?forgot=1")}>
                Request New Reset Link
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => router.push("/login")}>
                Back to Sign In
              </Button>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-green-600 dark:text-green-400 hover:underline">
              {"← Back to sign in"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
