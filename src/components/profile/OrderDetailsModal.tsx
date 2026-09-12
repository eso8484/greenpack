"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Badge from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";

export interface OrderDetailItem {
  name: string;
  quantity: number;
  /** Canonical unit price, recomputed server-side when the order was created. */
  price?: number;
}

export interface OrderDetailOrder {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  subtotal?: number;
  delivery_fee?: number;
  order_items?: OrderDetailItem[];
  customer_info?: {
    address?: string;
    city?: string;
  };
}

type StatusVariant = "green" | "blue" | "red" | "default";

interface OrderDetailsModalProps {
  order: OrderDetailOrder | null;
  statusVariant: StatusVariant;
  onClose: () => void;
}

const rowClass = "flex items-center justify-between gap-4 text-sm";

export default function OrderDetailsModal({
  order,
  statusVariant,
  onClose,
}: OrderDetailsModalProps) {
  // Escape closes the dialog. Only registered while a dialog is actually open.
  useEffect(() => {
    if (!order) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [order, onClose]);

  if (!order) return null;

  const items = order.order_items ?? [];
  // Prefer the stored subtotal, falling back to summing the lines for orders
  // created before it was persisted.
  const subtotal =
    typeof order.subtotal === "number"
      ? order.subtotal
      : items.reduce(
          (sum, item) =>
            sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
          0
        );
  const deliveryFee = Number(order.delivery_fee ?? 0);
  const total = Number(order.total_amount) || 0;
  const address = order.customer_info?.address?.trim();
  const city = order.customer_info?.city?.trim();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Order ${order.id.slice(0, 8).toUpperCase()} details`}
          className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Order {order.id.slice(0, 8).toUpperCase()}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {new Date(order.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
            >
              <svg
                className="w-6 h-6"
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

          <Badge variant={statusVariant}>
            {order.status.replace(/[-_]/g, " ")}
          </Badge>

          {/* Items */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Items
            </h3>
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No item details were recorded for this order.
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((item, index) => (
                  <li key={`${item.name}-${index}`} className={rowClass}>
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.name}
                      <span className="text-gray-400 dark:text-gray-500">
                        {" "}
                        &times;{item.quantity}
                      </span>
                    </span>
                    {typeof item.price === "number" && (
                      <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {formatPrice(item.price * (Number(item.quantity) || 0))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Totals */}
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <div className={rowClass}>
              <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
              <span className="text-gray-900 dark:text-white">
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className={rowClass}>
              <span className="text-gray-600 dark:text-gray-400">Delivery</span>
              <span className="text-gray-900 dark:text-white">
                {deliveryFee > 0 ? formatPrice(deliveryFee) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white">
                Total
              </span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          {/* Delivery address */}
          {address && (
            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Deliver to
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {address}
                {city ? `, ${city}` : ""}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
