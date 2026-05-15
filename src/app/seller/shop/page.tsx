"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { categories } from "@/lib/data/categories";

interface ShopFormState {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  categoryName: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  whatsapp: string;
  openTime: string;
  closeTime: string;
  days: string;
}

const EMPTY_FORM: ShopFormState = {
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  categoryId: "",
  categoryName: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  whatsapp: "",
  openTime: "",
  closeTime: "",
  days: "",
};

export default function ShopEditorPage() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ShopFormState>(EMPTY_FORM);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/seller/shop", { credentials: "include" });
        const payload = (await response.json()) as {
          success?: boolean;
          data?: {
            id: string;
            name?: string;
            slug?: string;
            description?: string;
            short_description?: string;
            category_id?: string;
            category_name?: string;
            location?: { address?: string; city?: string; state?: string };
            contact?: { phone?: string; email?: string; whatsapp?: string };
            hours?: { open?: string; close?: string; days?: string };
          };
          error?: string;
        };

        if (!response.ok || !payload.success || !payload.data?.id) {
          throw new Error(
            payload.error || "Create your seller shop profile before editing this page"
          );
        }

        if (cancelled) return;

        setShopId(payload.data.id);
        setForm({
          name: payload.data.name ?? "",
          slug: payload.data.slug ?? "",
          description: payload.data.description ?? "",
          shortDescription: payload.data.short_description ?? "",
          categoryId: payload.data.category_id ?? "",
          categoryName: payload.data.category_name ?? "",
          address: payload.data.location?.address ?? "",
          city: payload.data.location?.city ?? "",
          state: payload.data.location?.state ?? "",
          phone: payload.data.contact?.phone ?? "",
          email: payload.data.contact?.email ?? "",
          whatsapp: payload.data.contact?.whatsapp ?? "",
          openTime: payload.data.hours?.open ?? "",
          closeTime: payload.data.hours?.close ?? "",
          days: payload.data.hours?.days ?? "",
        });
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load shop profile");
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

  const updateField = (field: keyof ShopFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!shopId) {
      toast.error("Shop not loaded yet — refresh the page and try again");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/shops/${shopId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          short_description: form.shortDescription.trim(),
          category_id: form.categoryId.trim() || null,
          category_name: form.categoryName.trim() || null,
          location: {
            address: form.address.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
          },
          contact: {
            phone: form.phone.trim(),
            email: form.email.trim(),
            whatsapp: form.whatsapp.trim(),
          },
          hours: {
            open: form.openTime.trim(),
            close: form.closeTime.trim(),
            days: form.days.trim(),
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        console.error("Shop update failed:", payload);
        const errMsg =
          typeof payload.error === "string"
            ? payload.error
            : payload.error
              ? JSON.stringify(payload.error)
              : `Failed to update shop (status ${response.status})`;
        throw new Error(errMsg);
      }

      toast.success("Shop profile updated");
    } catch (error) {
      console.error("Save shop error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update shop");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading shop profile...</div>;
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Shop</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Edit your shop profile and business information
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
            Basic Information
          </h2>
          <div className="space-y-4">
            <Input
              id="shopName"
              label="Shop Name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
            <Input
              id="shopSlug"
              label="Slug"
              value={form.slug}
              onChange={(event) => updateField("slug", event.target.value)}
              required
            />
            <div className="space-y-1">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 resize-none"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
              />
            </div>
            <Input
              id="shortDescription"
              label="Short Description"
              value={form.shortDescription}
              onChange={(event) => updateField("shortDescription", event.target.value)}
            />
            <div className="space-y-1">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <select
                id="category"
                value={form.categoryId}
                onChange={(event) => {
                  const cat = categories.find((c) => c.id === event.target.value);
                  setForm((prev) => ({
                    ...prev,
                    categoryId: cat?.id ?? "",
                    categoryName: cat?.name ?? "",
                  }));
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
            Location
          </h2>
          <div className="space-y-4">
            <Input
              id="address"
              label="Street Address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="city"
                label="City"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                required
              />
              <Input
                id="state"
                label="State"
                value={form.state}
                onChange={(event) => updateField("state", event.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
            Contact Information
          </h2>
          <div className="space-y-4">
            <Input
              id="phone"
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              required
            />
            <Input
              id="shopEmail"
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />
            <Input
              id="whatsapp"
              label="WhatsApp (Optional)"
              type="tel"
              value={form.whatsapp}
              onChange={(event) => updateField("whatsapp", event.target.value)}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
            Business Hours
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="openTime"
                label="Opening Time"
                type="time"
                value={form.openTime}
                onChange={(event) => updateField("openTime", event.target.value)}
              />
              <Input
                id="closeTime"
                label="Closing Time"
                type="time"
                value={form.closeTime}
                onChange={(event) => updateField("closeTime", event.target.value)}
              />
            </div>
            <Input
              id="days"
              label="Working Days"
              placeholder="e.g. Monday - Saturday"
              value={form.days}
              onChange={(event) => updateField("days", event.target.value)}
            />
          </div>
        </div>

        <div className="sticky bottom-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-lg">
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
