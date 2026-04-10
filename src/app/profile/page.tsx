"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface OrderItem {
  name: string;
  quantity: number;
}

interface CustomerInfoPayload {
  address?: string;
  city?: string;
}

interface ProfileOrder {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  order_items?: OrderItem[];
  customer_info?: CustomerInfoPayload;
}

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  city?: string;
  isDefault: boolean;
}

type TabType = "overview" | "orders" | "addresses" | "settings";

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [editMode, setEditMode] = useState(false);
  const [orders, setOrders] = useState<ProfileOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [formData, setFormData] = useState({
    name:
      profile?.full_name ||
      (typeof user?.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : ""),
    email: user?.email || "",
    phone: profile?.phone || "",
  });

  useEffect(() => {
    setFormData({
      name:
        profile?.full_name ||
        (typeof user?.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : ""),
      email: user?.email || "",
      phone: profile?.phone || "",
    });
  }, [profile?.full_name, profile?.phone, user?.email, user?.user_metadata]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }

    const controller = new AbortController();

    const loadOrders = async () => {
      setOrdersLoading(true);
      try {
        const res = await fetch("/api/orders", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch orders");
        const payload = await res.json();
        setOrders(Array.isArray(payload.data) ? payload.data : []);
      } catch {
        if (!controller.signal.aborted) {
          setOrders([]);
          toast.error("Could not load order history");
        }
      } finally {
        if (!controller.signal.aborted) {
          setOrdersLoading(false);
        }
      }
    };

    loadOrders();
    return () => controller.abort();
  }, [user]);

  const savedAddresses = useMemo<SavedAddress[]>(() => {
    const unique = new Map<string, SavedAddress>();
    orders.forEach((order) => {
      const address = order.customer_info?.address?.trim();
      if (!address) return;
      const city = order.customer_info?.city?.trim();
      const key = `${address}|${city ?? ""}`;
      if (!unique.has(key)) {
        unique.set(key, {
          id: key,
          label: `Address ${unique.size + 1}`,
          address,
          city,
          isDefault: unique.size === 0,
        });
      }
    });
    return Array.from(unique.values());
  }, [orders]);

  const fullName =
    profile?.full_name ||
    (typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "Not set");
  const email = user?.email || "Not set";
  const phone = profile?.phone || "Not set";
  const memberSinceDate = profile?.created_at || user?.created_at;
  const memberSince = memberSinceDate
    ? new Date(memberSinceDate).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Not available";

  const totalSpent = orders.reduce(
    (sum, order) => sum + (Number(order.total_amount) || 0),
    0
  );

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
      case "pending":
      case "confirmed":
      case "processing":
      case "ready":
      case "assigned":
      case "picking_up":
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
                        onClick={async () => {
                          const { error } = await updateProfile({
                            full_name: formData.name.trim() || null,
                            phone: formData.phone.trim() || null,
                          });
                          if (error) {
                            toast.error(error);
                            return;
                          }
                          toast.success("Profile updated");
                          setEditMode(false);
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
                        {fullName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {email}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Phone
                      </label>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {phone}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Member Since
                      </label>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {memberSince}
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
                    {orders.length}
                  </p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Total Spent
                  </h3>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatPrice(totalSpent)}
                  </p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Saved Addresses
                  </h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {savedAddresses.length}
                  </p>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="space-y-4">
              {ordersLoading && (
                <Card className="p-6">
                  <p className="text-gray-600 dark:text-gray-400">Loading orders...</p>
                </Card>
              )}
              {!ordersLoading && orders.length === 0 && (
                <Card className="p-6">
                  <p className="text-gray-600 dark:text-gray-400">
                    No orders yet. Your order history will appear here once you place an order.
                  </p>
                </Card>
              )}
              {!ordersLoading && orders.map((order) => {
                const totalItems = (order.order_items ?? []).reduce(
                  (sum, item) => sum + (Number(item.quantity) || 0),
                  0
                );
                const firstItemName = order.order_items?.[0]?.name || "Order items";

                return (
                <Card key={order.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                        {order.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status.replace(/[-_]/g, " ")}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {firstItemName}
                        {totalItems > 1 ? ` • ${totalItems} items` : ""}
                      </p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatPrice(order.total_amount)}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary">
                      View Details
                    </Button>
                  </div>
                </Card>
                );
              })}
            </div>
          )}

          {activeTab === "addresses" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Saved Addresses
                </h2>
                <Button size="sm" disabled>
                  Add New Address
                </Button>
              </div>
              {savedAddresses.length === 0 ? (
                <Card className="p-6">
                  <p className="text-gray-600 dark:text-gray-400">
                    No saved addresses yet. Addresses from your completed checkouts will appear here.
                  </p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                {savedAddresses.map((addr) => (
                  <Card key={addr.id} className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {addr.label}
                        </h3>
                        {addr.isDefault && <Badge variant="green">Default</Badge>}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      {addr.address}
                    </p>
                    {addr.city && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {addr.city}
                      </p>
                    )}
                  </Card>
                ))}
                </div>
              )}
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
                      Last profile update:{" "}
                      {profile?.updated_at
                        ? new Date(profile.updated_at).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Not available"}
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
