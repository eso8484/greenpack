"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

type RecoveryStatus = "verifying" | "ready" | "success" | "error";

function isRecoveryType(value: string | null): value is "recovery" {
  return value === "recovery";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [status, setStatus] = useState<RecoveryStatus>("verifying");
  const [statusMessage, setStatusMessage] = useState("Validating your password reset link...");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const activateRecoverySession = async () => {
      try {
        const currentUrl = new URL(window.location.href);
        const code = currentUrl.searchParams.get("code");
        const tokenHash = currentUrl.searchParams.get("token_hash");
        const queryType = currentUrl.searchParams.get("type");
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hashType = hashParams.get("type");

        let recovered = false;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          recovered = true;
        } else if (accessToken && refreshToken && isRecoveryType(hashType)) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          recovered = true;
        } else if (tokenHash && isRecoveryType(queryType)) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (error) throw error;
          recovered = true;
        }

        if (!recovered) {
          setStatus("error");
          setStatusMessage("This reset link is invalid or expired. Please request a new one.");
          return;
        }

        currentUrl.searchParams.delete("code");
        currentUrl.searchParams.delete("type");
        currentUrl.searchParams.delete("token_hash");
        window.history.replaceState({}, "", currentUrl.pathname);

        setStatus("ready");
        setStatusMessage("Set a new password for your account.");
      } catch {
        setStatus("error");
        setStatusMessage("This reset link is invalid or expired. Please request a new one.");
      }
    };

    activateRecoverySession();
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
    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setStatus("success");
    setStatusMessage("Password updated successfully. You can now sign in.");
    toast.success("Password updated successfully");
  };

  if (status === "verifying") {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          <p className="mt-4 text-gray-700 dark:text-gray-300">{statusMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
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
                {submitting ? "Updating..." : "Update Password"}
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
              <Button size="lg" className="w-full" onClick={() => router.push("/login")}>Back to Sign In</Button>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-green-600 dark:text-green-400 hover:underline">
              {"<- Back to sign in"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
