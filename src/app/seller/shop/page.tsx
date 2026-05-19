"use client";

import { FormEvent, useEffect, useState } from "react";
// useState is also used below for the geolocation buttons added in this file.
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ImageUpload from "@/components/ui/ImageUpload";
import ImageGalleryUpload from "@/components/ui/ImageGalleryUpload";
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
  lat: number | null;
  lng: number | null;
  phone: string;
  email: string;
  whatsapp: string;
  openTime: string;
  closeTime: string;
  days: string;
  thumbnail: string;
  banner: string;
  gallery: string[];
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
  lat: null,
  lng: null,
  phone: "",
  email: "",
  whatsapp: "",
  openTime: "",
  closeTime: "",
  days: "",
  thumbnail: "",
  banner: "",
  gallery: [],
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
            lat?: number | string | null;
            lng?: number | string | null;
            contact?: { phone?: string; email?: string; whatsapp?: string };
            hours?: { open?: string; close?: string; days?: string };
            images?: { thumbnail?: string; banner?: string; gallery?: string[] };
          };
          error?: string;
        };

        if (!response.ok || !payload.success || !payload.data?.id) {
          return;
        }

        if (cancelled) return;

        setShopId(payload.data.id);
        const rawLat = payload.data.lat;
        const rawLng = payload.data.lng;
        const lat = rawLat == null ? null : Number(rawLat);
        const lng = rawLng == null ? null : Number(rawLng);
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
          lat: Number.isFinite(lat) ? lat : null,
          lng: Number.isFinite(lng) ? lng : null,
          phone: payload.data.contact?.phone ?? "",
          email: payload.data.contact?.email ?? "",
          whatsapp: payload.data.contact?.whatsapp ?? "",
          openTime: payload.data.hours?.open ?? "",
          closeTime: payload.data.hours?.close ?? "",
          days: payload.data.hours?.days ?? "",
          thumbnail: payload.data.images?.thumbnail ?? "",
          banner: payload.data.images?.banner ?? "",
          gallery: Array.isArray(payload.data.images?.gallery)
            ? payload.data.images.gallery
            : [],
        });
      } catch {
        // silent — form stays empty if shop can't be loaded
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

  const [locating, setLocating] = useState(false);
  const [verifying, setVerifying] = useState(false);

  /**
   * Browser geolocation → coords → reverse geocode → fill the address fields.
   * Used by the "Use My Current Location" button; ensures the saved shop
   * coordinates are exactly where the vendor is standing (so courier distance
   * calc is accurate) and the address text matches.
   */
  const handleUseMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("This browser does not support location detection");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/geocode/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          );
          const payload = (await res.json()) as {
            success?: boolean;
            data?: {
              lat: number;
              lng: number;
              address?: string;
              city?: string;
              state?: string;
            } | null;
          };

          if (!payload.success || !payload.data) {
            // Still capture the raw coords — manual address is fine.
            setForm((prev) => ({
              ...prev,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }));
            toast.success("Coordinates captured. Please enter the address manually.");
            return;
          }

          const { address, city, state, lat, lng } = payload.data;
          setForm((prev) => ({
            ...prev,
            address: address ?? prev.address,
            city: city ?? prev.city,
            state: state ?? prev.state,
            lat,
            lng,
          }));
          toast.success("Location detected and address filled in");
        } catch (err) {
          console.error("Reverse geocode failed", err);
          toast.error("Could not look up your address — coordinates only");
          setForm((prev) => ({
            ...prev,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }));
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please enter address manually.");
        } else {
          toast.error("Unable to determine your location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  /**
   * Forward geocode the typed address. Lets the vendor confirm the shop
   * appears at the right pin before saving — without leaving the form.
   */
  const handleVerifyAddress = async () => {
    const address = form.address.trim();
    const city = form.city.trim();
    const state = form.state.trim();
    if (!address && !city) {
      toast.error("Enter an address or city before verifying");
      return;
    }
    setVerifying(true);
    try {
      const params = new URLSearchParams({ address });
      if (city) params.set("city", city);
      if (state) params.set("state", state);
      const res = await fetch(`/api/geocode/forward?${params.toString()}`);
      const payload = (await res.json()) as {
        success?: boolean;
        data?: { lat: number; lng: number; formatted?: string } | null;
      };
      if (!payload.success || !payload.data) {
        toast.error("Couldn't find this address. Try refining the entry or use 'Use My Location'.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        lat: payload.data!.lat,
        lng: payload.data!.lng,
      }));
      toast.success(
        payload.data.formatted
          ? `Pinned: ${payload.data.formatted}`
          : "Address verified"
      );
    } catch (err) {
      console.error("Forward geocode failed", err);
      toast.error("Address verification failed. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedSlug = form.slug.trim();
    const trimmedCategoryId = form.categoryId.trim();
    const trimmedCategoryName = form.categoryName.trim();

    if (!trimmedName) {
      toast.error("Shop name is required");
      return;
    }
    if (!trimmedSlug || !/^[a-z0-9-]+$/.test(trimmedSlug)) {
      toast.error("Slug must use lowercase letters, numbers, and dashes only");
      return;
    }
    // Category required only when creating a new shop (POST). For updates, missing
    // category just means we leave the existing one untouched.
    if (!shopId && (!trimmedCategoryId || !trimmedCategoryName)) {
      toast.error("Pick a category before saving your shop");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: trimmedName,
        slug: trimmedSlug,
        description: form.description.trim(),
        short_description: form.shortDescription.trim(),
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
        images: {
          thumbnail: form.thumbnail.trim(),
          banner: form.banner.trim(),
          gallery: form.gallery.filter((url) => url.trim().length > 0),
        },
      };
      if (trimmedCategoryId) body.category_id = trimmedCategoryId;
      if (trimmedCategoryName) body.category_name = trimmedCategoryName;
      // Persist verified coordinates so courier distance calc uses the exact
      // pin instead of re-geocoding text addresses on every order.
      if (form.lat != null && Number.isFinite(form.lat)) body.lat = form.lat;
      if (form.lng != null && Number.isFinite(form.lng)) body.lng = form.lng;

      const isCreate = !shopId;
      const endpoint = isCreate ? "/api/seller/shop" : `/api/shops/${shopId}`;
      const method = isCreate ? "POST" : "PUT";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      let payload: { success?: boolean; data?: { id?: string }; error?: unknown } = {};
      try {
        payload = await response.json();
      } catch {
        // Non-JSON response (e.g. HTML error page) — fall through to status-based error.
      }

      if (!response.ok || !payload.success) {
        console.error("Shop save failed:", { status: response.status, payload });
        const errMsg =
          typeof payload.error === "string"
            ? payload.error
            : payload.error
              ? JSON.stringify(payload.error)
              : `Failed to save shop (status ${response.status})`;
        throw new Error(errMsg);
      }

      // POST returns the created shop id — store it so subsequent saves update.
      if (isCreate && payload.data?.id) {
        setShopId(payload.data.id);
      }

      toast.success(isCreate ? "Shop profile created" : "Shop profile updated");
    } catch (error) {
      console.error("Save shop error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save shop");
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
            Shop Images
          </h2>
          <div className="space-y-5">
            <ImageUpload
              label="Shop Thumbnail (displayed in listings)"
              value={form.thumbnail}
              onChange={(url) => updateField("thumbnail", url)}
              folder="shops/thumbnail"
            />
            <ImageUpload
              label="Shop Banner (displayed on shop page)"
              value={form.banner}
              onChange={(url) => updateField("banner", url)}
              folder="shops/banner"
            />
            <ImageGalleryUpload
              label="Shop Gallery (different angles or items — shown on shop page)"
              value={form.gallery}
              onChange={(urls) => setForm((prev) => ({ ...prev, gallery: urls }))}
              folder="shops/gallery"
              maxImages={8}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Location
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Couriers calculate distance from the exact pin — please verify
                your location.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-60 transition-colors"
            >
              <span className="material-symbols-outlined text-base">
                {locating ? "progress_activity" : "my_location"}
              </span>
              {locating ? "Detecting..." : "Use My Current Location"}
            </button>
          </div>
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

            <div className="flex items-center gap-3 flex-wrap pt-2">
              <button
                type="button"
                onClick={handleVerifyAddress}
                disabled={verifying || !form.address.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-base">
                  {verifying ? "progress_activity" : "search"}
                </span>
                {verifying ? "Verifying..." : "Verify Address on Map"}
              </button>

              {form.lat != null && form.lng != null && (
                <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 font-medium">
                  <span className="material-symbols-outlined text-base">verified</span>
                  <span>
                    Location verified · {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                  </span>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${form.lat}&mlon=${form.lng}#map=17/${form.lat}/${form.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline ml-1"
                  >
                    View on map ↗
                  </a>
                </div>
              )}
              {(form.lat == null || form.lng == null) && form.address.trim() && (
                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">warning</span>
                  Not yet verified — couriers may estimate distance approximately
                </span>
              )}
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
