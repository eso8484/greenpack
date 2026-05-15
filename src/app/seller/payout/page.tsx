"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface Bank {
  code: string;
  name: string;
}

interface PayoutDetails {
  paystack_subaccount_code: string | null;
  settlement_bank_code: string | null;
  settlement_account_number: string | null;
  settlement_account_name: string | null;
}

export default function SellerPayoutPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<PayoutDetails | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Load banks + current payout details in parallel
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [banksRes, payoutRes] = await Promise.all([
          fetch("/api/banks"),
          fetch("/api/seller/payout", { credentials: "include" }),
        ]);

        const banksJson = await banksRes.json();
        if (banksRes.ok && banksJson.success && Array.isArray(banksJson.data)) {
          if (!cancelled) {
            setBanks(
              (banksJson.data as Bank[])
                .map((b) => ({ code: b.code, name: b.name }))
                .sort((a, b) => a.name.localeCompare(b.name))
            );
          }
        }

        const payoutJson = await payoutRes.json();
        if (payoutRes.ok && payoutJson.success && payoutJson.data) {
          if (!cancelled) {
            const data = payoutJson.data as PayoutDetails;
            setExisting(data);
            // If no subaccount yet, start in edit mode automatically
            if (!data.paystack_subaccount_code) {
              setEditMode(true);
            }
          }
        } else if (payoutRes.status === 404) {
          if (!cancelled) setEditMode(true);
        }
      } catch {
        // silent — load failure leaves blank form
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolveAccount = async () => {
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      setAccountName("");
      return;
    }
    setResolving(true);
    setAccountName("");
    try {
      const res = await fetch("/api/banks/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber, bankCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(
          typeof json.error === "string" ? json.error : "Could not verify account"
        );
        return;
      }
      setAccountName(json.data.account_name);
    } catch {
      toast.error("Network error verifying account");
    } finally {
      setResolving(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!bankCode || !accountNumber || !accountName) {
      toast.error("Select a bank and verify your account number first");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/seller/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bankCode, accountNumber }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const msg =
          typeof json.error === "string" ? json.error : "Failed to save payout details";
        throw new Error(msg);
      }
      toast.success("Payout account saved");
      setExisting(json.data as PayoutDetails);
      setEditMode(false);
      setBankCode("");
      setAccountNumber("");
      setAccountName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payout details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading payout details...</div>;
  }

  const hasExisting = existing?.paystack_subaccount_code;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payout Account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Add the bank account where Green Pack should settle your earnings
        </p>
      </div>

      {hasExisting && !editMode && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Current Payout Account
              </h2>
              <span className="inline-block mt-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                Verified
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              Update
            </Button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Account Name</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {existing?.settlement_account_name ?? "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Account Number</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {existing?.settlement_account_number ?? "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Subaccount</span>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                {existing?.paystack_subaccount_code ?? "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {(editMode || !hasExisting) && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
              {hasExisting ? "Update Payout Account" : "Bank Details"}
            </h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="bank"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Bank
                </label>
                <select
                  id="bank"
                  value={bankCode}
                  onChange={(event) => {
                    setBankCode(event.target.value);
                    setAccountName("");
                  }}
                  onBlur={resolveAccount}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900"
                  required
                >
                  <option value="">Select your bank</option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                id="accountNumber"
                label="Account Number"
                inputMode="numeric"
                maxLength={10}
                value={accountNumber}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
                  setAccountNumber(digits);
                  setAccountName("");
                }}
                onBlur={resolveAccount}
                placeholder="10-digit account number"
                required
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Account Name
                </label>
                <div
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                    accountName
                      ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20 text-green-800 dark:text-green-300 font-medium"
                      : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50 text-gray-400"
                  }`}
                >
                  {resolving
                    ? "Verifying..."
                    : accountName || "Auto-filled after we verify your account"}
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs rounded-lg px-3 py-2.5">
                Green Pack keeps 3% of each transaction as a service fee. The remaining 97%
                settles directly to your bank account.
              </div>
            </div>
          </div>

          <div className="flex gap-3 sticky bottom-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-lg">
            {hasExisting && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => {
                  setEditMode(false);
                  setBankCode("");
                  setAccountNumber("");
                  setAccountName("");
                }}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" size="lg" className="flex-1" disabled={saving || !accountName}>
              {saving ? "Saving..." : hasExisting ? "Update Account" : "Save Payout Account"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
