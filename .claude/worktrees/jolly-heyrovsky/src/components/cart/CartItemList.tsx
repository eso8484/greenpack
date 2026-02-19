"use client";

import { useCart } from "@/hooks/useCart";
import CartItem from "./CartItem";
import EmptyState from "@/components/ui/EmptyState";

export default function CartItemList() {
  const { items } = useCart();

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Browse shops and add products or services to get started."
        actionLabel="Browse Shops"
        actionHref="/browse"
      />
    );
  }

  // Group items by shop
  const grouped = items.reduce(
    (acc, item) => {
      if (!acc[item.shopName]) acc[item.shopName] = [];
      acc[item.shopName].push(item);
      return acc;
    },
    {} as Record<string, typeof items>
  );

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([shopName, shopItems]) => (
        <div key={shopName}>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            {shopName}
          </h3>
          <div className="space-y-3">
            {shopItems.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
