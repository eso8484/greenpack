"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { CustomerInfo } from "@/types";

interface ContactFormProps {
  onSubmit: (info: CustomerInfo) => void;
  isSubmitting: boolean;
}

export default function ContactForm({
  onSubmit,
  isSubmitting,
}: ContactFormProps) {
  const [form, setForm] = useState<CustomerInfo>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    message: "",
  });

  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});

  const validate = (): boolean => {
    const newErrors: Partial<CustomerInfo> = {};
    if (!form.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "Invalid email";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Contact Information
      </h2>
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
      <Input
        id="address"
        label="Address (optional)"
        placeholder="Your delivery address"
        value={form.address || ""}
        onChange={(e) => update("address", e.target.value)}
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
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Submit Order"}
      </Button>
    </form>
  );
}
