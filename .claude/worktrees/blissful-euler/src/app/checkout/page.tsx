"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ContactForm from "@/components/checkout/ContactForm";
import OrderReview from "@/components/checkout/OrderReview";
import { useCart } from "@/hooks/useCart";
import Button from "@/components/ui/Button";
import Link from "next/link";
import type { CustomerInfo } from "@/types";

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (info: CustomerInfo) => {
    setIsSubmitting(true);

    // Simulate submission
    setTimeout(() => {
      console.log("Order submitted:", { customer: info, items });
      setIsSubmitting(false);
      setIsSuccess(true);
      clearCart();
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Order Submitted!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Your inquiry has been sent to the service providers. They will contact
          you shortly to confirm details and pricing.
        </p>
        <Link href="/">
          <Button size="lg">Back to Home</Button>
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Your cart is empty
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Add some products or services before checking out.
        </p>
        <Link href="/browse">
          <Button size="lg">Browse Shops</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Checkout</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <ContactForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
        <div className="w-full lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-24">
            <OrderReview />
          </div>
        </div>
      </div>
    </div>
  );
}
