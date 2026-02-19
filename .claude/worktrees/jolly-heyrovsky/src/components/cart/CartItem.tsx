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
    <div className="flex gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
      {/* Image */}
      {item.image ? (
        <div className="relative w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0">
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
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center shrink-0">
          <svg
            className="w-8 h-8 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
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
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
          >
            <svg
              className="w-4.5 h-4.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatPrice(item.price * item.quantity)}
          </span>

          {item.type === "product" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-green-400 hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
              >
                -
              </button>
              <span className="text-sm font-medium w-6 text-center">
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-7 h-7 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-green-400 hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
              >
                +
              </button>
            </div>
          ) : (
            <input
              type="text"
              placeholder="Add notes..."
              value={item.notes || ""}
              onChange={(e) => updateNotes(item.id, e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md px-2 py-1 w-32 focus:border-green-500 focus:outline-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}
