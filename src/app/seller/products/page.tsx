"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatPrice } from "@/lib/utils";

interface ProductItem {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    inStock: boolean;
    quantity: number;
    image?: string;
}

const initialProducts: ProductItem[] = [
    { id: "p1", name: "Premium Shea Butter", price: 3500, originalPrice: 4500, inStock: true, quantity: 24 },
    { id: "p2", name: "African Black Soap", price: 2000, inStock: true, quantity: 50 },
    { id: "p3", name: "Coconut Hair Oil", price: 4500, inStock: true, quantity: 15 },
    { id: "p4", name: "Natural Hair Conditioner", price: 6000, originalPrice: 7500, inStock: false, quantity: 0 },
    { id: "p5", name: "Beard Growth Kit", price: 12000, inStock: true, quantity: 8 },
    { id: "p6", name: "Styling Gel Pack", price: 1800, inStock: true, quantity: 35 },
];

export default function ProductsPage() {
    const [products, setProducts] = useState<ProductItem[]>(initialProducts);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: "", price: "", originalPrice: "", quantity: "" });

    const handleToggleStock = (id: string) => {
        setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, inStock: !p.inStock } : p))
        );
    };

    const handleDelete = (id: string) => {
        setProducts((prev) => prev.filter((p) => p.id !== id));
    };

    const handleEdit = (product: ProductItem) => {
        setEditingId(product.id);
        setForm({
            name: product.name,
            price: String(product.price),
            originalPrice: product.originalPrice ? String(product.originalPrice) : "",
            quantity: String(product.quantity),
        });
        setShowForm(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            setProducts((prev) =>
                prev.map((p) =>
                    p.id === editingId
                        ? {
                            ...p,
                            name: form.name,
                            price: Number(form.price),
                            originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
                            quantity: Number(form.quantity),
                            inStock: Number(form.quantity) > 0,
                        }
                        : p
                )
            );
        } else {
            setProducts((prev) => [
                ...prev,
                {
                    id: `p${Date.now()}`,
                    name: form.name,
                    price: Number(form.price),
                    originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
                    quantity: Number(form.quantity),
                    inStock: Number(form.quantity) > 0,
                },
            ]);
        }
        setForm({ name: "", price: "", originalPrice: "", quantity: "" });
        setShowForm(false);
        setEditingId(null);
    };

    const totalValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const inStockCount = products.filter((p) => p.inStock).length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage your inventory ({products.length} products, {inStockCount} in stock)
                    </p>
                </div>
                <Button
                    size="sm"
                    onClick={() => {
                        setEditingId(null);
                        setForm({ name: "", price: "", originalPrice: "", quantity: "" });
                        setShowForm(true);
                    }}
                >
                    + Add Product
                </Button>
            </div>

            {/* Summary Cards */}
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
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatPrice(totalValue)}</p>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {editingId ? "Edit Product" : "Add New Product"}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            id="productName"
                            label="Product Name"
                            placeholder="e.g. Premium Shea Butter"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                id="productPrice"
                                label="Price (₦)"
                                type="number"
                                placeholder="e.g. 5000"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                                required
                            />
                            <Input
                                id="originalPrice"
                                label="Original Price (₦, optional)"
                                type="number"
                                placeholder="e.g. 7000"
                                value={form.originalPrice}
                                onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                            />
                            <Input
                                id="quantity"
                                label="Stock Quantity"
                                type="number"
                                placeholder="e.g. 10"
                                value={form.quantity}
                                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Product Image
                            </label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-green-400 transition-colors cursor-pointer">
                                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm text-gray-500">
                                    <span className="text-green-600 font-medium">Click to upload</span> product image
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="submit" size="sm">
                                {editingId ? "Update Product" : "Add Product"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingId(null);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                    <div
                        key={product.id}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                    >
                        {/* Image Placeholder */}
                        <div className="h-32 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center">
                            <span className="text-4xl">📦</span>
                        </div>
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{product.name}</h3>
                                <span
                                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${product.inStock
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                        }`}
                                >
                                    {product.inStock ? "In Stock" : "Out of Stock"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                    {formatPrice(product.price)}
                                </span>
                                {product.originalPrice && (
                                    <span className="text-sm text-gray-400 line-through">
                                        {formatPrice(product.originalPrice)}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Qty: {product.quantity}</p>
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => handleEdit(product)}
                                    className="flex-1 text-xs font-medium text-green-600 hover:text-green-700 dark:text-green-400 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors cursor-pointer"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleToggleStock(product.id)}
                                    className="flex-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                >
                                    {product.inStock ? "Mark Out" : "Restock"}
                                </button>
                                <button
                                    onClick={() => handleDelete(product.id)}
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
                    <p className="mt-3 text-gray-500 dark:text-gray-400">No products yet. Add your first product to get started!</p>
                </div>
            )}
        </div>
    );
}
