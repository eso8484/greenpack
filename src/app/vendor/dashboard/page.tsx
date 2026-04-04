"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { motion } from "framer-motion";

// Mock vendor data
const mockVendorData = {
  shopName: "CleanWave Laundry",
  totalOrders: 156,
  revenue: 624000,
  rating: 4.7,
  reviewCount: 34,
  activeProducts: 8,
  activeServices: 5,
};

const mockOrders = [
  {
    id: "ORD-156",
    customer: "John D.",
    items: "Wash & Fold, Express Wash",
    total: 4000,
    status: "pending" as const,
    date: "2026-03-02",
  },
  {
    id: "ORD-155",
    customer: "Mary K.",
    items: "Dry Cleaning",
    total: 3000,
    status: "in-progress" as const,
    date: "2026-03-01",
  },
  {
    id: "ORD-154",
    customer: "Peter O.",
    items: "Wash & Fold",
    total: 1500,
    status: "completed" as const,
    date: "2026-02-28",
  },
];

type TabType = "overview" | "orders" | "products" | "analytics";

export default function VendorDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const tabs: { id: TabType; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "orders", label: "Orders" },
    { id: "products", label: "Products & Services" },
    { id: "analytics", label: "Analytics" },
  ];

  const getStatusColor = (status: string): "green" | "yellow" | "red" | "default" => {
    switch (status) {
      case "pending":
        return "default";
      case "in-progress":
        return "yellow";
      case "completed":
        return "green";
      default:
        return "default";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Vendor Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back! Manage your shop: {mockVendorData.shopName}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-green-500 text-green-600 dark:text-green-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Total Orders
                  </h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {mockVendorData.totalOrders}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    +12% from last month
                  </p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Total Revenue
                  </h3>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatPrice(mockVendorData.revenue)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    +8% from last month
                  </p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Shop Rating
                  </h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {mockVendorData.rating}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {mockVendorData.reviewCount} reviews
                  </p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Active Listings
                  </h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {mockVendorData.activeProducts + mockVendorData.activeServices}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {mockVendorData.activeProducts} products, {mockVendorData.activeServices} services
                  </p>
                </Card>
              </div>

              {/* Recent Orders */}
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Recent Orders
                  </h2>
                  <Button size="sm">View All</Button>
                </div>
                <div className="space-y-4">
                  {mockOrders.slice(0, 3).map((order) => (
                    <div
                      key={order.id}
                      className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {order.id}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {order.customer} • {order.items}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatPrice(order.total)}
                        </p>
                        <Badge variant={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "orders" && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                All Orders
              </h2>
              <div className="space-y-3">
                {mockOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white mb-1">
                        {order.id}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {order.customer} • {order.items}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {order.date}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatPrice(order.total)}
                        </p>
                        <Badge variant={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      <Button size="sm" variant="secondary">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === "products" && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Products & Services
                </h2>
                <Button>Add New</Button>
              </div>
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>Products and services management coming soon...</p>
              </div>
            </Card>
          )}

          {activeTab === "analytics" && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Analytics & Insights
              </h2>
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>Analytics dashboard coming soon...</p>
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
