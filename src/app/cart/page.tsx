"use client";

import CartItemList from "@/components/cart/CartItemList";
import CartSummary from "@/components/cart/CartSummary";

export default function CartPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Cart</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <CartItemList />
        </div>
        <div className="w-full lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-24">
            <CartSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
