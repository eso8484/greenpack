"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";

interface SellerShop {
  id: string;
  name: string;
  rating: number;
  review_count: number;
}

interface SellerOrder {
  id: string;
  total_amount: number;
  status: string;
  customer_info?: { fullName?: string; full_name?: string };
  order_items?: Array<{ name: string; quantity: number }>;
  created_at: string;
}

interface SellerService {
  id: string;
}

interface SellerProduct {
  id: string;
}

interface ApiListResponse<T> {
  success?: boolean;
  data?: T[];
  error?: string;
}

const statusColor: Record<string, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ready: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function SellerDashboard() {
  const [shop, setShop] = useState<SellerShop | null>(null);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [services, setServices] = useState<SellerService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const shopRes = await fetch("/api/seller/shop", { credentials: "include" });
        const shopPayload = (await shopRes.json()) as {
          success?: boolean;
          data?: SellerShop;
          error?: string;
        };

        if (!shopRes.ok || !shopPayload.success || !shopPayload.data?.id) {
          if (!cancelled) {
            setOrders([]);
            setProducts([]);
            setServices([]);
          }
          return;
        }

        if (cancelled) return;
        setShop(shopPayload.data);

        const [ordersRes, productsRes, servicesRes] = await Promise.all([
          fetch(`/api/orders?shopId=${shopPayload.data.id}`, { credentials: "include" }),
          fetch(`/api/shops/${shopPayload.data.id}/products`, { credentials: "include" }),
          fetch(`/api/shops/${shopPayload.data.id}/services`, { credentials: "include" }),
        ]);

        const [ordersPayload, productsPayload, servicesPayload] = await Promise.all([
          ordersRes.json(),
          productsRes.json(),
          servicesRes.json(),
        ]) as [
          ApiListResponse<SellerOrder>,
          ApiListResponse<SellerProduct>,
          ApiListResponse<SellerService>
        ];

        if (!ordersRes.ok || !ordersPayload.success || !Array.isArray(ordersPayload.data)) {
          throw new Error(
            typeof ordersPayload.error === "string"
              ? ordersPayload.error
              : "Failed to load seller orders"
          );
        }
        if (!productsRes.ok || !productsPayload.success || !Array.isArray(productsPayload.data)) {
          throw new Error(
            typeof productsPayload.error === "string"
              ? productsPayload.error
              : "Failed to load seller products"
          );
        }
        if (!servicesRes.ok || !servicesPayload.success || !Array.isArray(servicesPayload.data)) {
          throw new Error(
            typeof servicesPayload.error === "string"
              ? servicesPayload.error
              : "Failed to load seller services"
          );
        }

        if (!cancelled) {
          setOrders(ordersPayload.data);
          setProducts(productsPayload.data);
          setServices(servicesPayload.data);
        }
      } catch {
        if (!cancelled) {
          setOrders([]);
          setProducts([]);
          setServices([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const paidRevenue = useMemo(
    () =>
      orders
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    [orders]
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 8),
    [orders]
  );

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Welcome back! {shop ? `Here is how ${shop.name} is performing.` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/seller/services">
            <Button size="sm">+ Add Service</Button>
          </Link>
          <Link href="/seller/shop">
            <Button variant="outline" size="sm">
              Edit Shop
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{orders.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {formatPrice(paidRevenue)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">Avg. Rating</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {shop?.rating?.toFixed(1) ?? "0.0"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {(shop?.review_count ?? 0)} reviews
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">Active Listings</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {products.length + services.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {products.length} products, {services.length} services
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
          {shop && (
            <Link
              href={`/api/orders?shopId=${shop.id}`}
              className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 font-medium"
            >
              API View
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-gray-100 dark:border-gray-700">
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3 uppercase tracking-wider">
                  Order
                </th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3 uppercase tracking-wider hidden md:table-cell">
                  Items
                </th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {order.customer_info?.fullName || order.customer_info?.full_name || "Customer"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                    {(order.order_items ?? [])
                      .slice(0, 2)
                      .map((item) => `${item.name} x${item.quantity}`)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {formatPrice(Number(order.total_amount || 0))}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusColor[order.status] ||
                        "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentOrders.length === 0 && (
            <div className="px-6 py-10 text-sm text-gray-500 dark:text-gray-400 text-center">
              No orders yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
