"use client";

import { useEffect, useState } from "react";
import ContactForm from "@/components/checkout/ContactForm";
import OrderReview from "@/components/checkout/OrderReview";
import { useCart } from "@/hooks/useCart";
import Button from "@/components/ui/Button";
import Link from "next/link";
import type { CustomerInfo } from "@/types";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const paymentReference =
    searchParams.get("reference") ?? searchParams.get("trxref");

  useEffect(() => {
    if (!paymentReference) return;

    let cancelled = false;

    const verifyPayment = async () => {
      setIsVerifyingPayment(true);
      setPaymentError(null);

      try {
        const response = await fetch(
          `/api/payments/paystack/verify/${encodeURIComponent(paymentReference)}`,
          { method: "POST" }
        );
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          const errorMessage =
            typeof payload.error === "string"
              ? payload.error
              : "Payment verification failed";
          if (!cancelled) {
            setPaymentError(errorMessage);
            toast.error(errorMessage);
          }
          return;
        }

        if (!cancelled) {
          setIsSuccess(true);
          clearCart();
          toast.success("Payment confirmed. Your order is now in progress.");
        }
      } catch {
        if (!cancelled) {
          setPaymentError("Unable to verify payment right now. Please retry shortly.");
          toast.error("Unable to verify payment right now.");
        }
      } finally {
        if (!cancelled) setIsVerifyingPayment(false);
      }
    };

    verifyPayment();
    return () => {
      cancelled = true;
    };
  }, [clearCart, paymentReference]);

  const handleSubmit = async (info: CustomerInfo) => {
    if (items.length === 0) return;
    setIsSubmitting(true);

    const invalidCartItem = items.find(
      (item) => !isUuid(item.shopId) || !isUuid(item.id)
    );
    if (invalidCartItem) {
      toast.error(
        "Your cart includes an item with invalid data. Please remove and add it again."
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_amount: items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          ),
          customer_info: info,
          needs_delivery: false,
          payment_provider: "paystack",
          payment_currency: "NGN",
          items: items.map((item) => ({
            shop_id: item.shopId,
            item_type: item.type,
            item_id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            notes: item.notes,
          })),
        }),
      });

      const orderPayload = await orderResponse.json();
      if (!orderResponse.ok || !orderPayload.success || !orderPayload.data?.id) {
        throw new Error(
          typeof orderPayload.error === "string"
            ? orderPayload.error
            : "Failed to create order"
        );
      }

      const paymentResponse = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderPayload.data.id,
          email: info.email,
        }),
      });

      const paymentPayload = await paymentResponse.json();
      if (
        !paymentResponse.ok ||
        !paymentPayload.success ||
        !paymentPayload.data?.authorization_url
      ) {
        throw new Error(
          typeof paymentPayload.error === "string"
            ? paymentPayload.error
            : "Failed to initialize payment"
        );
      }

      window.location.assign(paymentPayload.data.authorization_url);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Checkout failed. Please try again.";
      toast.error(message);
      setIsSubmitting(false);
    }
  };

  if (isVerifyingPayment) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Verifying payment...
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Please wait while we confirm your Paystack transaction.
        </p>
      </div>
    );
  }

  if (paymentError) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payment not confirmed yet
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{paymentError}</p>
        <Button size="lg" onClick={() => window.location.reload()}>
          Retry verification
        </Button>
      </div>
    );
  }

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
          Payment Successful!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Your order has been confirmed and paid successfully. We&apos;ll keep you
          updated as fulfillment progresses.
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
