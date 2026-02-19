"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatPrice } from "@/lib/utils";

interface ServiceItem {
    id: string;
    name: string;
    price: number;
    priceType: string;
    duration: string;
    isAvailable: boolean;
}

const initialServices: ServiceItem[] = [
    { id: "s1", name: "Classic Haircut", price: 3500, priceType: "fixed", duration: "30 mins", isAvailable: true },
    { id: "s2", name: "Premium Hair Package", price: 15000, priceType: "fixed", duration: "2 hours", isAvailable: true },
    { id: "s3", name: "Beard Grooming", price: 5000, priceType: "fixed", duration: "45 mins", isAvailable: true },
    { id: "s4", name: "Braiding Service", price: 8000, priceType: "starting_from", duration: "3 hours", isAvailable: false },
    { id: "s5", name: "Full Spa Package", price: 25000, priceType: "fixed", duration: "4 hours", isAvailable: true },
];

export default function ServicesPage() {
    const [services, setServices] = useState<ServiceItem[]>(initialServices);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: "", price: "", priceType: "fixed", duration: "" });

    const handleToggleAvailability = (id: string) => {
        setServices((prev) =>
            prev.map((s) => (s.id === id ? { ...s, isAvailable: !s.isAvailable } : s))
        );
    };

    const handleDelete = (id: string) => {
        setServices((prev) => prev.filter((s) => s.id !== id));
    };

    const handleEdit = (service: ServiceItem) => {
        setEditingId(service.id);
        setForm({
            name: service.name,
            price: String(service.price),
            priceType: service.priceType,
            duration: service.duration,
        });
        setShowForm(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            setServices((prev) =>
                prev.map((s) =>
                    s.id === editingId
                        ? { ...s, name: form.name, price: Number(form.price), priceType: form.priceType, duration: form.duration }
                        : s
                )
            );
        } else {
            setServices((prev) => [
                ...prev,
                {
                    id: `s${Date.now()}`,
                    name: form.name,
                    price: Number(form.price),
                    priceType: form.priceType,
                    duration: form.duration,
                    isAvailable: true,
                },
            ]);
        }
        setForm({ name: "", price: "", priceType: "fixed", duration: "" });
        setShowForm(false);
        setEditingId(null);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage your shop&apos;s services ({services.length} total)
                    </p>
                </div>
                <Button
                    size="sm"
                    onClick={() => {
                        setEditingId(null);
                        setForm({ name: "", price: "", priceType: "fixed", duration: "" });
                        setShowForm(true);
                    }}
                >
                    + Add Service
                </Button>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {editingId ? "Edit Service" : "Add New Service"}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                id="serviceName"
                                label="Service Name"
                                placeholder="e.g. Premium Haircut"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                            <Input
                                id="servicePrice"
                                label="Price (₦)"
                                type="number"
                                placeholder="e.g. 5000"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label htmlFor="priceType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Price Type
                                </label>
                                <select
                                    id="priceType"
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900"
                                    value={form.priceType}
                                    onChange={(e) => setForm({ ...form, priceType: e.target.value })}
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
                                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="submit" size="sm">
                                {editingId ? "Update Service" : "Add Service"}
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

            {/* Services List */}
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
                                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${service.isAvailable
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                            }`}
                                    >
                                        {service.isAvailable ? "Available" : "Unavailable"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mt-1.5">
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                        {formatPrice(service.price)}
                                        {service.priceType === "starting_from" && "+"}
                                        {service.priceType === "per_hour" && "/hr"}
                                    </span>
                                    {service.duration && (
                                        <span className="text-sm text-gray-400">⏱ {service.duration}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <button
                                    onClick={() => handleToggleAvailability(service.id)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${service.isAvailable ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${service.isAvailable ? "translate-x-6" : "translate-x-1"
                                            }`}
                                    />
                                </button>
                                <button
                                    onClick={() => handleEdit(service)}
                                    className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
                                    title="Edit"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleDelete(service.id)}
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
                    <p className="mt-3 text-gray-500 dark:text-gray-400">No services yet. Add your first service to get started!</p>
                </div>
            )}
        </div>
    );
}
