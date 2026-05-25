"use client";

import CartItemList from "@/components/cart/CartItemList";
import CartSummary from "@/components/cart/CartSummary";

export default function CartPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25">
          <span className="material-symbols-outlined">shopping_cart</span>
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Your cart
        </h1>
      </div>
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
