"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AddressAutocomplete, {
  type ResolvedAddress,
} from "@/components/ui/AddressAutocomplete";
import type { CustomerInfo } from "@/types";

interface ContactFormProps {
  onSubmit: (info: CustomerInfo) => void;
  isSubmitting: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  /** Whether a delivery address (with coords) is required before submitting. */
  addressRequired?: boolean;
  /** Fired when the user picks an address suggestion — carries coords. */
  onAddressResolved?: (resolved: ResolvedAddress) => void;
  /** Fired when the address text is edited after resolving (coords stale). */
  onAddressCleared?: () => void;
}

export default function ContactForm({
  onSubmit,
  isSubmitting,
  disabled = false,
  disabledReason = null,
  addressRequired = false,
  onAddressResolved,
  onAddressCleared,
}: ContactFormProps) {
  const [form, setForm] = useState<CustomerInfo>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    message: "",
  });

  const [addressResolved, setAddressResolved] = useState(false);
  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});

  const validate = (): boolean => {
    const newErrors: Partial<CustomerInfo> = {};
    if (!form.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "Invalid email";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    if (addressRequired) {
      if (!form.address?.trim()) {
        newErrors.address = "Delivery address is required";
      } else if (!addressResolved) {
        newErrors.address =
          "Pick your address from the suggestions so we can calculate delivery";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(form);
    }
  };

  const update = (field: keyof CustomerInfo, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-white dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700/70 p-5 md:p-6 shadow-sm"
    >
      <div className="mb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-2">
          <span className="material-symbols-outlined text-[14px] fill-1">person</span>
          Your details
        </span>
        <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tight">
          Contact information
        </h2>
      </div>
      <Input
        id="fullName"
        label="Full Name *"
        placeholder="Enter your full name"
        value={form.fullName}
        onChange={(e) => update("fullName", e.target.value)}
        error={errors.fullName}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="email"
          label="Email *"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          error={errors.email}
        />
        <Input
          id="phone"
          label="Phone *"
          type="tel"
          placeholder="+234 800 000 0000"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          error={errors.phone}
        />
      </div>
      <AddressAutocomplete
        id="address"
        label={addressRequired ? "Delivery Address *" : "Address (optional)"}
        placeholder="Start typing your delivery address…"
        value={form.address || ""}
        resolved={addressResolved}
        error={errors.address}
        onChange={(value) => {
          update("address", value);
        }}
        onClearResolved={() => {
          if (addressResolved) {
            setAddressResolved(false);
            onAddressCleared?.();
          }
        }}
        onResolve={(r) => {
          setForm((prev) => ({ ...prev, address: r.address }));
          setAddressResolved(true);
          if (errors.address) {
            setErrors((prev) => ({ ...prev, address: undefined }));
          }
          onAddressResolved?.(r);
        }}
      />
      <div className="space-y-1">
        <label
          htmlFor="message"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Message / Notes (optional)
        </label>
        <textarea
          id="message"
          rows={3}
          placeholder="Any special instructions or requests..."
          value={form.message || ""}
          onChange={(e) => update("message", e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-colors resize-none"
        />
      </div>
      {disabled && disabledReason && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {disabledReason}
        </div>
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting || disabled}
      >
        {isSubmitting ? "Redirecting to Paystack..." : "Proceed to Secure Payment"}
      </Button>
    </form>
  );
}
