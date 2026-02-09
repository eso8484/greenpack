"use client";

import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function CartSummary() {
  const { items, itemCount, subtotal } = useCart();

  const hasServices = items.some((item) => item.type === "service");

  if (items.length === 0) return null;

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Items ({itemCount})</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatPrice(subtotal)}
          </span>
        </div>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-4">
        <div className="flex justify-between">
          <span className="font-semibold text-gray-900 dark:text-white">Total</span>
          <span className="font-bold text-lg text-green-600 dark:text-green-400">
            {formatPrice(subtotal)}
          </span>
        </div>
      </div>
      {hasServices && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          * Service prices may vary. Final price confirmed by provider.
        </p>
      )}
      <Link href="/checkout">
        <Button className="w-full" size="lg">
          Proceed to Checkout
        </Button>
      </Link>
    </Card>
  );
}
