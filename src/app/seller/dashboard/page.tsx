"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";

const stats = [
    { label: "Total Views", value: "2,458", change: "+12%", icon: "👁️" },
    { label: "Total Orders", value: "184", change: "+8%", icon: "📦" },
    { label: "Revenue", value: formatPrice(485000), change: "+23%", icon: "💰" },
    { label: "Avg. Rating", value: "4.8", change: "+0.2", icon: "⭐" },
];

const recentOrders = [
    { id: "ORD-001", customer: "Amina Ibrahim", service: "Premium Hair Package", amount: 15000, status: "completed", date: "Today" },
    { id: "ORD-002", customer: "David Okafor", service: "Classic Haircut", amount: 3500, status: "pending", date: "Today" },
    { id: "ORD-003", customer: "Grace Adeola", service: "Braiding Service", amount: 8000, status: "completed", date: "Yesterday" },
    { id: "ORD-004", customer: "Tunde Bakare", service: "Beard Grooming", amount: 5000, status: "in_progress", date: "Yesterday" },
    { id: "ORD-005", customer: "Ngozi Eze", service: "Full Spa Package", amount: 25000, status: "completed", date: "2 days ago" },
];

const statusColor: Record<string, string> = {
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function SellerDashboard() {
    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Welcome back! Here&apos;s how your shop is doing.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/seller/services">
                        <Button size="sm">+ Add Service</Button>
                    </Link>
                    <Link href="/seller/shop">
                        <Button variant="outline" size="sm">Edit Shop</Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl">{stat.icon}</span>
                            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                                {stat.change}
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Link href="/seller/services" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-center">
                        <span className="text-2xl">🛠️</span>
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">Add Service</span>
                    </Link>
                    <Link href="/seller/products" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-center">
                        <span className="text-2xl">📦</span>
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Add Product</span>
                    </Link>
                    <Link href="/seller/shop" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-center">
                        <span className="text-2xl">✏️</span>
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Edit Shop</span>
                    </Link>
                    <Link href="/shop/lavender-luxe-salon" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-center">
                        <span className="text-2xl">👁️</span>
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-400">View Shop</span>
                    </Link>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between p-6 pb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
                    <button className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 font-medium cursor-pointer">
                        View all
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-t border-gray-100 dark:border-gray-700">
                                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3 uppercase tracking-wider">Order</th>
                                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3 uppercase tracking-wider">Customer</th>
                                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3 uppercase tracking-wider hidden md:table-cell">Service</th>
                                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3 uppercase tracking-wider">Amount</th>
                                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-6 py-3 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {recentOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{order.id}</span>
                                        <span className="block text-xs text-gray-400 mt-0.5">{order.date}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{order.customer}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">{order.service}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{formatPrice(order.amount)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[order.status]}`}>
                                            {order.status.replace("_", " ")}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
