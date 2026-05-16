"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ImageGalleryUpload from "@/components/ui/ImageGalleryUpload";
import { formatPrice } from "@/lib/utils";

interface ProductItem {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  in_stock: boolean;
  quantity: number;
  image: string | null;
  gallery: string[] | null;
}

interface ProductFormState {
  name: string;
  price: string;
  originalPrice: string;
  quantity: string;
  gallery: string[];
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  price: "",
  originalPrice: "",
  quantity: "",
  gallery: [],
};

export default function ProductsPage() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  const loadProducts = useCallback(async (targetShopId: string) => {
    const response = await fetch(`/api/shops/${targetShopId}/products`, {
      credentials: "include",
    });
    const payload = (await response.json()) as {
      success?: boolean;
      data?: ProductItem[];
      error?: string;
    };

    if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
      throw new Error(payload.error || "Failed to load products");
    }

    setProducts(payload.data);
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
          if (!cancelled) setProducts([]);
          return;
        }

        if (cancelled) return;

        setShopId(shopPayload.data.id);
        await loadProducts(shopPayload.data.id);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [loadProducts]);

  const totalInventoryValue = useMemo(
    () => products.reduce((sum, product) => sum + product.price * product.quantity, 0),
    [products]
  );
  const inStockCount = useMemo(
    () => products.filter((product) => product.in_stock).length,
    [products]
  );

  const openCreateForm = () => {
    setEditingProductId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (product: ProductItem) => {
    setEditingProductId(product.id);
    const existingGallery = Array.isArray(product.gallery) ? product.gallery : [];
    const merged =
      product.image && !existingGallery.includes(product.image)
        ? [product.image, ...existingGallery]
        : existingGallery;
    setForm({
      name: product.name,
      price: String(product.price),
      originalPrice: product.original_price ? String(product.original_price) : "",
      quantity: String(product.quantity),
      gallery: merged,
    });
    setShowForm(true);
  };

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    if (!shopId) return;

    const price = Number(form.price);
    const quantity = Number(form.quantity);
    const originalPrice = form.originalPrice.trim()
      ? Number(form.originalPrice)
      : undefined;

    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid product price");
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error("Enter a valid stock quantity");
      return;
    }
    if (originalPrice !== undefined && (!Number.isFinite(originalPrice) || originalPrice <= 0)) {
      toast.error("Enter a valid original price");
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingProductId
        ? `/api/products/${editingProductId}`
        : `/api/shops/${shopId}/products`;
      const method = editingProductId ? "PUT" : "POST";

      const cleanGallery = form.gallery.filter((url) => url.trim().length > 0);
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          description: "",
          price,
          original_price: originalPrice,
          quantity,
          in_stock: quantity > 0,
          image: cleanGallery[0] || undefined,
          gallery: cleanGallery,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Failed to save product"
        );
      }

      await loadProducts(shopId);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setEditingProductId(null);
      toast.success(editingProductId ? "Product updated" : "Product created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const toggleStock = async (product: ProductItem) => {
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ in_stock: !product.in_stock }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to update stock status"
        );
      }

      if (shopId) await loadProducts(shopId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update stock status");
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Failed to delete product"
        );
      }

      if (shopId) await loadProducts(shopId);
      toast.success("Product deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete product");
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your inventory ({products.length} products, {inStockCount} in stock)
          </p>
        </div>
        <Button size="sm" onClick={openCreateForm}>
          + Add Product
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Products</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{products.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">In Stock</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{inStockCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">Inventory Value</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {formatPrice(totalInventoryValue)}
          </p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingProductId ? "Edit Product" : "Add New Product"}
          </h3>
          <form onSubmit={submitForm} className="space-y-4">
            <Input
              id="productName"
              label="Product Name"
              placeholder="e.g. Premium Shea Butter"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                id="productPrice"
                label="Price (₦)"
                type="number"
                placeholder="e.g. 5000"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
              <Input
                id="originalPrice"
                label="Original Price (₦, optional)"
                type="number"
                placeholder="e.g. 7000"
                value={form.originalPrice}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, originalPrice: event.target.value }))
                }
              />
              <Input
                id="quantity"
                label="Stock Quantity"
                type="number"
                placeholder="e.g. 10"
                value={form.quantity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, quantity: event.target.value }))
                }
                required
              />
            </div>
            <ImageGalleryUpload
              label="Product Images (first one is the main; add multiple angles)"
              value={form.gallery}
              onChange={(urls) => setForm((prev) => ({ ...prev, gallery: urls }))}
              folder="products"
              maxImages={6}
            />
            <div className="flex gap-2 pt-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingProductId
                    ? "Update Product"
                    : "Add Product"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setEditingProductId(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="h-32 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center relative overflow-hidden">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl">📦</span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {product.name}
                </h3>
                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                    product.in_stock
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {product.in_stock ? "In Stock" : "Out of Stock"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatPrice(product.price)}
                </span>
                {product.original_price && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(product.original_price)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Qty: {product.quantity}</p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => openEditForm(product)}
                  className="flex-1 text-xs font-medium text-green-600 hover:text-green-700 dark:text-green-400 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleStock(product)}
                  className="flex-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  {product.in_stock ? "Mark Out" : "Restock"}
                </button>
                <button
                  onClick={() => deleteProduct(product.id)}
                  className="flex-1 text-xs font-medium text-red-500 hover:text-red-600 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <span className="text-4xl">📦</span>
          <p className="mt-3 text-gray-500 dark:text-gray-400">
            No products yet. Add your first product to get started.
          </p>
        </div>
      )}
    </div>
  );
}
