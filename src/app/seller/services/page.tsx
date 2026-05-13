"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatPrice } from "@/lib/utils";

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  price_type: "fixed" | "starting_from" | "per_hour" | "negotiable";
  duration: string | null;
  is_available: boolean;
}

interface ServiceFormState {
  name: string;
  description: string;
  price: string;
  priceType: "fixed" | "starting_from" | "per_hour" | "negotiable";
  duration: string;
}

const EMPTY_FORM: ServiceFormState = {
  name: "",
  description: "",
  price: "",
  priceType: "fixed",
  duration: "",
};

export default function ServicesPage() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);

  const loadServices = useCallback(async (targetShopId: string) => {
    const response = await fetch(`/api/shops/${targetShopId}/services`, {
      credentials: "include",
    });
    const payload = (await response.json()) as {
      success?: boolean;
      data?: ServiceItem[];
      error?: string;
    };

    if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
      throw new Error(payload.error || "Failed to load services");
    }

    setServices(payload.data);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const shopResponse = await fetch("/api/seller/shop", {
          credentials: "include",
        });
        const shopPayload = (await shopResponse.json()) as {
          success?: boolean;
          data?: { id?: string };
          error?: string;
        };

        if (!shopResponse.ok || !shopPayload.success || !shopPayload.data?.id) {
          throw new Error(
            shopPayload.error || "Create your seller shop profile before adding services"
          );
        }

        if (cancelled) return;

        setShopId(shopPayload.data.id);
        await loadServices(shopPayload.data.id);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load services");
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
  }, [loadServices]);

  const openCreateForm = () => {
    setEditingServiceId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (service: ServiceItem) => {
    setEditingServiceId(service.id);
    setForm({
      name: service.name,
      description: service.description ?? "",
      price: String(service.price),
      priceType: service.price_type,
      duration: service.duration ?? "",
    });
    setShowForm(true);
  };

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    if (!shopId) return;

    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid service price");
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingServiceId
        ? `/api/services/${editingServiceId}`
        : `/api/shops/${shopId}/services`;
      const method = editingServiceId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          price,
          price_type: form.priceType,
          duration: form.duration.trim() || null,
          is_available: true,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Failed to save service"
        );
      }

      await loadServices(shopId);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setEditingServiceId(null);
      toast.success(editingServiceId ? "Service updated" : "Service created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (service: ServiceItem) => {
    try {
      const response = await fetch(`/api/services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_available: !service.is_available }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to update service availability"
        );
      }

      if (shopId) await loadServices(shopId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update service availability"
      );
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Failed to delete service"
        );
      }

      if (shopId) await loadServices(shopId);
      toast.success("Service deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete service");
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading services...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your shop&apos;s services ({services.length} total)
          </p>
        </div>
        <Button size="sm" onClick={openCreateForm}>
          + Add Service
        </Button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingServiceId ? "Edit Service" : "Add New Service"}
          </h3>
          <form onSubmit={submitForm} className="space-y-4">
            <Input
              id="serviceName"
              label="Service Name"
              placeholder="e.g. Premium Haircut"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <div className="space-y-1">
              <label
                htmlFor="serviceDescription"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Description
              </label>
              <textarea
                id="serviceDescription"
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 resize-none"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                id="servicePrice"
                label="Price (₦)"
                type="number"
                placeholder="e.g. 5000"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
              <div className="space-y-1">
                <label htmlFor="priceType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price Type
                </label>
                <select
                  id="priceType"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900"
                  value={form.priceType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      priceType: event.target.value as ServiceFormState["priceType"],
                    }))
                  }
                >
                  <option value="fixed">Fixed</option>
                  <option value="starting_from">Starting from</option>
                  <option value="per_hour">Per hour</option>
                  <option value="negotiable">Negotiable</option>
                </select>
              </div>
              <Input
                id="duration"
                label="Duration"
                placeholder="e.g. 1 hour"
                value={form.duration}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, duration: event.target.value }))
                }
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving..." : editingServiceId ? "Update Service" : "Add Service"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setEditingServiceId(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                    {service.name}
                  </h3>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      service.is_available
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {service.is_available ? "Available" : "Unavailable"}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {formatPrice(service.price)}
                    {service.price_type === "starting_from" && "+"}
                    {service.price_type === "per_hour" && "/hr"}
                  </span>
                  {service.duration && (
                    <span className="text-sm text-gray-400">⏱ {service.duration}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => toggleAvailability(service)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    service.is_available ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      service.is_available ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <button
                  onClick={() => openEditForm(service)}
                  className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteService(service.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <span className="text-4xl">🛠️</span>
          <p className="mt-3 text-gray-500 dark:text-gray-400">
            No services yet. Add your first service to get started.
          </p>
        </div>
      )}
    </div>
  );
}
