"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ShopEditorPage() {
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({
        name: "Lavender Luxe Salon",
        description: "Premium beauty and grooming services in the heart of the city. We offer a wide range of services including hair styling, spa treatments, bridal makeup, and more.",
        category: "barbershop-salon",
        address: "15 Wuse II, Cadastral Zone",
        city: "Abuja",
        state: "FCT",
        phone: "+234 812 345 6789",
        email: "hello@lavenderluxe.ng",
        whatsapp: "+234 812 345 6789",
        openTime: "08:00",
        closeTime: "20:00",
        days: "Monday - Saturday",
    });

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="max-w-3xl space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Shop</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Edit your shop profile and manage business information
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Basic Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Basic Information</h2>
                    <div className="space-y-4">
                        <Input
                            id="shopName"
                            label="Shop Name"
                            value={form.name}
                            onChange={(e) => updateField("name", e.target.value)}
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
                                onChange={(e) => updateField("description", e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Category
                            </label>
                            <select
                                id="category"
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900"
                                value={form.category}
                                onChange={(e) => updateField("category", e.target.value)}
                            >
                                <option value="barbershop-salon">Barbershop & Salon</option>
                                <option value="laundry-dry-cleaning">Laundry & Dry Cleaning</option>
                                <option value="phone-tech-repair">Phone & Tech Repair</option>
                                <option value="fashion-clothing">Fashion & Clothing</option>
                                <option value="food-restaurant">Food & Restaurant</option>
                                <option value="home-services">Home Services</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Images */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Shop Images</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Shop Thumbnail
                            </label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer">
                                <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    <span className="text-green-600 dark:text-green-400 font-medium">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Banner Image
                            </label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer">
                                <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    <span className="text-green-600 dark:text-green-400 font-medium">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Recommended: 1200×400px</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Shop Video Preview
                            </label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer">
                                <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    <span className="text-green-600 dark:text-green-400 font-medium">Upload a video</span> of your shop
                                </p>
                                <p className="text-xs text-gray-400 mt-1">MP4, MOV up to 50MB</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Location</h2>
                    <div className="space-y-4">
                        <Input
                            id="address"
                            label="Street Address"
                            value={form.address}
                            onChange={(e) => updateField("address", e.target.value)}
                            required
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                id="city"
                                label="City"
                                value={form.city}
                                onChange={(e) => updateField("city", e.target.value)}
                                required
                            />
                            <Input
                                id="state"
                                label="State"
                                value={form.state}
                                onChange={(e) => updateField("state", e.target.value)}
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Contact */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Contact Information</h2>
                    <div className="space-y-4">
                        <Input
                            id="phone"
                            label="Phone"
                            type="tel"
                            value={form.phone}
                            onChange={(e) => updateField("phone", e.target.value)}
                            required
                        />
                        <Input
                            id="shopEmail"
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={(e) => updateField("email", e.target.value)}
                            required
                        />
                        <Input
                            id="whatsapp"
                            label="WhatsApp (Optional)"
                            type="tel"
                            value={form.whatsapp}
                            onChange={(e) => updateField("whatsapp", e.target.value)}
                        />
                    </div>
                </div>

                {/* Hours */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Business Hours</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                id="openTime"
                                label="Opening Time"
                                type="time"
                                value={form.openTime}
                                onChange={(e) => updateField("openTime", e.target.value)}
                            />
                            <Input
                                id="closeTime"
                                label="Closing Time"
                                type="time"
                                value={form.closeTime}
                                onChange={(e) => updateField("closeTime", e.target.value)}
                            />
                        </div>
                        <Input
                            id="days"
                            label="Working Days"
                            placeholder="e.g. Monday - Saturday"
                            value={form.days}
                            onChange={(e) => updateField("days", e.target.value)}
                        />
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-4 sticky bottom-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-lg">
                    <Button type="submit" size="lg" className="flex-1">
                        {saved ? "✓ Changes Saved!" : "Save Changes"}
                    </Button>
                    {saved && (
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium animate-pulse">
                            Profile updated successfully
                        </span>
                    )}
                </div>
            </form>
        </div>
    );
}
