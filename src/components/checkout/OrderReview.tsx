"use client";

import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

interface OrderReviewProps {
  deliveryFee?: number;
  deliveryDistanceKm?: number | null;
  hasProducts?: boolean;
  isCalculatingDelivery?: boolean;
  deliveryBlocked?: boolean;
}

export default function OrderReview({
  deliveryFee = 0,
  deliveryDistanceKm = null,
  hasProducts = false,
  isCalculatingDelivery = false,
  deliveryBlocked = false,
}: OrderReviewProps) {
  const { items, subtotal } = useCart();

  if (items.length === 0) return null;

  // Group by shop
  const grouped = items.reduce(
    (acc, item) => {
      if (!acc[item.shopName]) acc[item.shopName] = [];
      acc[item.shopName].push(item);
      return acc;
    },
    {} as Record<string, typeof items>
  );

  const showDeliveryLine = hasProducts;
  const total = subtotal + (showDeliveryLine ? deliveryFee : 0);

  return (
    <Card className="p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white">Order review</h3>
        <Link
          href="/cart"
          className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
        >
          Edit Cart
        </Link>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([shopName, shopItems]) => (
          <div key={shopName}>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              {shopName}
            </p>
            <div className="space-y-2">
              {shopItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
                    <Badge
                      variant={item.type === "service" ? "green" : "default"}
                    >
                      {item.type === "service" ? "Svc" : `x${item.quantity}`}
                    </Badge>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white shrink-0 ml-2">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatPrice(subtotal)}
          </span>
        </div>

        {showDeliveryLine && (
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Delivery Fee</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {isCalculatingDelivery
                  ? "Calculating..."
                  : deliveryBlocked
                    ? "—"
                    : formatPrice(deliveryFee)}
              </span>
            </div>
            {!isCalculatingDelivery &&
              !deliveryBlocked &&
              typeof deliveryDistanceKm === "number" &&
              deliveryDistanceKm > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  &asymp; {deliveryDistanceKm.toFixed(1)} km from shop
                </p>
              )}
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="font-semibold text-gray-900 dark:text-white">Total</span>
          <span className="font-bold text-lg text-green-600 dark:text-green-400">
            {formatPrice(total)}
          </span>
        </div>
      </div>
    </Card>
  );
}
