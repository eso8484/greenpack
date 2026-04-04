"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { motion } from "framer-motion";

// Mock user data
const mockUser = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+234 801 234 5678",
  joinedDate: "January 2025",
  avatar: "https://placehold.co/150x150/22c55e/white?text=JD",
};

// Mock orders
const mockOrders = [
  {
    id: "ORD-001",
    date: "2026-02-28",
    shop: "CleanWave Laundry",
    items: 2,
    total: 4000,
    status: "completed" as const,
  },
  {
    id: "ORD-002",
    date: "2026-02-25",
    shop: "King's Cut Barbershop",
    items: 1,
    total: 3500,
    status: "completed" as const,
  },
  {
    id: "ORD-003",
    date: "2026-02-20",
    shop: "FixIt Phone Clinic",
    items: 1,
    total: 15000,
    status: "in-progress" as const,
  },
];

const mockAddresses = [
  {
    id: "1",
    label: "Home",
    address: "15 Admiralty Way, Lekki Phase 1",
    city: "Lagos",
    isDefault: true,
  },
  {
    id: "2",
    label: "Office",
    address: "22 Allen Avenue, Ikeja",
    city: "Lagos",
    isDefault: false,
  },
];

type TabType = "overview" | "orders" | "addresses" | "settings";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: mockUser.name,
    email: mockUser.email,
    phone: mockUser.phone,
  });

  const tabs: { id: TabType; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "orders", label: "Order History" },
    { id: "addresses", label: "Addresses" },
    { id: "settings", label: "Settings" },
  ];

  const getStatusColor = (status: string): "green" | "yellow" | "red" | "default" => {
    switch (status) {
      case "completed":
        return "green";
      case "in-progress":
        return "yellow";
      case "cancelled":
        return "red";
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
              My Account
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your profile and preferences
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
            <div className="grid md:grid-cols-3 gap-6">
              {/* Profile Card */}
              <Card className="p-6 md:col-span-2">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Profile Information
                  </h2>
                  {!editMode ? (
                    <Button size="sm" onClick={() => setEditMode(true)}>
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditMode(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditMode(false);
                          // Save logic here
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                {editMode ? (
                  <div className="space-y-4">
                    <Input
                      id="name"
                      label="Full Name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                    <Input
                      id="email"
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                    <Input
                      id="phone"
                      label="Phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Full Name
                      </label>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {mockUser.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {mockUser.email}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Phone
                      </label>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {mockUser.phone}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Member Since
                      </label>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {mockUser.joinedDate}
                      </p>
                    </div>
                  </div>
                )}
              </Card>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Total Orders
                  </h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {mockOrders.length}
                  </p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Total Spent
                  </h3>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatPrice(
                      mockOrders.reduce((sum, order) => sum + order.total, 0)
                    )}
                  </p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Saved Addresses
                  </h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {mockAddresses.length}
                  </p>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="space-y-4">
              {mockOrders.map((order) => (
                <Card key={order.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                        {order.id}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status.replace("-", " ")}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {order.shop} • {order.items}{" "}
                        {order.items === 1 ? "item" : "items"}
                      </p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary">
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === "addresses" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Saved Addresses
                </h2>
                <Button size="sm">Add New Address</Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {mockAddresses.map((addr) => (
                  <Card key={addr.id} className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {addr.label}
                        </h3>
                        {addr.isDefault && <Badge variant="green">Default</Badge>}
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                      </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      {addr.address}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {addr.city}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Account Settings
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                    Notifications
                  </h3>
                  <div className="space-y-3">
                    {[
                      "Email notifications for new orders",
                      "SMS notifications for deliveries",
                      "Promotional emails and offers",
                    ].map((setting) => (
                      <label
                        key={setting}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                          defaultChecked
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {setting}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                    Security
                  </h3>
                  <div className="space-y-3">
                    <Button variant="secondary">Change Password</Button>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Last changed: 30 days ago
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-red-600 dark:text-red-400 mb-3">
                    Danger Zone
                  </h3>
                  <Button variant="secondary" className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950">
                    Delete Account
                  </Button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Once you delete your account, there is no going back.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
