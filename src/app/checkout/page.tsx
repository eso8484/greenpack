"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ContactForm from "@/components/checkout/ContactForm";
import OrderReview from "@/components/checkout/OrderReview";
import type { ResolvedAddress } from "@/components/ui/AddressAutocomplete";
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

interface ShopDeliveryQuote {
  shopId: string;
  distanceKm: number;
  fee: number;
  blocked: boolean;
  reason?: string;
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  // Tracks which payment reference has already been verified so the effect
  // can't re-run verification for the same reference.
  const verifiedReferenceRef = useRef<string | null>(null);

  // Customer coordinates come from the address the customer selects in the
  // ContactForm autocomplete (no device GPS). They drive the delivery-fee
  // distance calculation.
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [addressSelected, setAddressSelected] = useState(false);

  // Delivery quote state
  const [quotes, setQuotes] = useState<ShopDeliveryQuote[]>([]);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  const paymentReference =
    searchParams.get("reference") ?? searchParams.get("trxref");

  // Whether the cart contains any physical product (delivery only applies to products)
  const hasProducts = useMemo(
    () => items.some((i) => i.type === "product"),
    [items]
  );

  // Unique shop IDs that need a delivery quote (only those with products in cart)
  const productShopIds = useMemo(() => {
    const ids = new Set<string>();
    items.forEach((item) => {
      if (item.type === "product") ids.add(item.shopId);
    });
    return Array.from(ids);
  }, [items]);

  // Handlers wired to the ContactForm address autocomplete. Selecting a
  // suggestion gives us precise coords; editing the text afterwards clears them
  // so a stale fee can't be used.
  const handleAddressResolved = (r: ResolvedAddress) => {
    setCustomerLat(r.lat);
    setCustomerLng(r.lng);
    setAddressSelected(true);
  };
  const handleAddressCleared = () => {
    setCustomerLat(null);
    setCustomerLng(null);
    setAddressSelected(false);
    setQuotes([]);
  };

  // Fetch delivery-fee per shop once we have coords + shop ids
  useEffect(() => {
    if (!hasProducts) {
      setQuotes([]);
      setDeliveryError(null);
      return;
    }
    if (customerLat == null || customerLng == null) return;
    if (productShopIds.length === 0) {
      setQuotes([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setIsCalculatingDelivery(true);
      setDeliveryError(null);
      try {
        const results = await Promise.all(
          productShopIds.map(async (shopId) => {
            const response = await fetch("/api/delivery-fee", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                shopId,
                customerLat,
                customerLng,
              }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success || !payload?.data) {
              throw new Error(
                (payload && typeof payload.error === "string"
                  ? payload.error
                  : null) ?? "Could not calculate delivery fee"
              );
            }
            return {
              shopId,
              distanceKm: Number(payload.data.distanceKm ?? 0),
              fee: Number(payload.data.fee ?? 0),
              blocked: Boolean(payload.data.blocked),
              reason:
                typeof payload.data.reason === "string"
                  ? payload.data.reason
                  : undefined,
            } as ShopDeliveryQuote;
          })
        );
        if (!cancelled) setQuotes(results);
      } catch (err) {
        if (!cancelled) {
          setQuotes([]);
          setDeliveryError(
            err instanceof Error
              ? err.message
              : "Could not calculate delivery fee"
          );
        }
      } finally {
        if (!cancelled) setIsCalculatingDelivery(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [hasProducts, customerLat, customerLng, productShopIds]);

  // Derived totals
  const deliveryFee = useMemo(
    () => quotes.reduce((sum, q) => sum + (q.blocked ? 0 : q.fee), 0),
    [quotes]
  );

  const deliveryDistanceKm = useMemo(() => {
    if (quotes.length === 0) return null;
    // Show the max distance across all shops (most useful single signal for the customer)
    return Math.max(...quotes.map((q) => q.distanceKm));
  }, [quotes]);

  const anyBlocked = useMemo(() => quotes.some((q) => q.blocked), [quotes]);

  const totalAmount = subtotal + (hasProducts ? deliveryFee : 0);

  // Reason the Pay button should be disabled (if any)
  const payDisabledReason: string | null = (() => {
    if (!hasProducts) return null;
    if (!addressSelected)
      return "Enter your delivery address and pick it from the suggestions to calculate delivery.";
    if (anyBlocked) return "Delivery only available within Abuja for now";
    if (deliveryError) return deliveryError;
    if (isCalculatingDelivery) return "Calculating delivery fee...";
    if (quotes.length === 0 && productShopIds.length > 0)
      return "Delivery fee not yet calculated";
    return null;
  })();

  const payDisabled = payDisabledReason !== null;

  useEffect(() => {
    if (!paymentReference) return;
    // Verify each reference exactly once. Without this guard a changing
    // dependency (or a re-render after clearCart) could re-fire verification
    // in a loop.
    if (verifiedReferenceRef.current === paymentReference) return;
    verifiedReferenceRef.current = paymentReference;

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
    if (payDisabled) {
      if (payDisabledReason) toast.error(payDisabledReason);
      return;
    }
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
          total_amount: totalAmount,
          subtotal,
          delivery_fee: hasProducts ? deliveryFee : 0,
          delivery_distance_km: hasProducts ? deliveryDistanceKm : null,
          customer_info: {
            ...info,
            // Persist the coords from the selected address so couriers can see
            // distance + navigate without re-geocoding.
            ...(customerLat != null && customerLng != null
              ? { lat: customerLat, lng: customerLng }
              : {}),
          },
          needs_delivery: hasProducts,
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
        // Surface the real reason. Validation failures return an object of
        // field errors; flatten it to a readable string instead of hiding it
        // behind a generic "Failed to create order".
        const raw = orderPayload.error;
        let message = "Failed to create order";
        if (typeof raw === "string") {
          message = raw;
        } else if (raw && typeof raw === "object") {
          const parts = Object.entries(raw as Record<string, unknown>).map(
            ([field, errs]) =>
              `${field}: ${Array.isArray(errs) ? errs.join(", ") : String(errs)}`
          );
          if (parts.length) message = parts.join(" · ");
        }
        throw new Error(message);
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
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30">
          <span className="material-symbols-outlined text-5xl">check</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
          Payment successful!
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
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25">
          <span className="material-symbols-outlined">lock</span>
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Checkout
        </h1>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <ContactForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            disabled={payDisabled}
            disabledReason={payDisabledReason}
            addressRequired={hasProducts}
            onAddressResolved={handleAddressResolved}
            onAddressCleared={handleAddressCleared}
          />
        </div>
        <div className="w-full lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-24">
            <OrderReview
              deliveryFee={deliveryFee}
              deliveryDistanceKm={deliveryDistanceKm}
              hasProducts={hasProducts}
              isCalculatingDelivery={isCalculatingDelivery}
              deliveryBlocked={anyBlocked}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
