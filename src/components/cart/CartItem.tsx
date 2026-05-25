"use client";

import Image from "next/image";
import { useCart } from "@/hooks/useCart";
import { formatPrice, BLUR_PLACEHOLDER } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import type { CartItem as CartItemType } from "@/types";

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { removeItem, updateQuantity, updateNotes } = useCart();

  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700/70 hover:shadow-lg hover:shadow-green-500/5 transition-shadow">
      {/* Image */}
      {item.image ? (
        <div className="relative w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden shrink-0">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            unoptimized
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
          />
        </div>
      ) : (
        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-800/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-green-400 text-3xl">
            {item.type === "service" ? "design_services" : "inventory_2"}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500">{item.shopName}</p>
            <Badge variant={item.type === "service" ? "green" : "default"} className="mt-1">
              {item.type === "service" ? "Service" : "Product"}
            </Badge>
          </div>
          <button
            onClick={() => removeItem(item.id)}
            aria-label={`Remove ${item.name}`}
            className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatPrice(item.price * item.quantity)}
          </span>

          {item.type === "product" ? (
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                aria-label="Decrease quantity"
                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <span className="text-sm font-bold w-6 text-center tabular-nums">
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                aria-label="Increase quantity"
                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          ) : (
            <input
              type="text"
              placeholder="Add notes..."
              value={item.notes || ""}
              onChange={(e) => updateNotes(item.id, e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 w-32 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 focus:outline-none transition-colors"
            />
          )}
        </div>
      </div>
    </div>
  );
}
