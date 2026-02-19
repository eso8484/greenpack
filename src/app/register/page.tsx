"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (form.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        // Demo: simulate registration and redirect
        setTimeout(() => {
            router.push("/seller/dashboard");
        }, 1000);
    };

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6">
                        <Image
                            src="/logo.png"
                            alt="Green Pack Delight"
                            width={48}
                            height={48}
                            className="rounded-full"
                            unoptimized
                        />
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            Green<span className="text-green-500">Pack</span>
                        </span>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Register your shop
                    </h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                        Create an account to get your business discovered
                    </p>
                </div>

                {/* Registration Form */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            id="fullName"
                            label="Full Name"
                            type="text"
                            placeholder="John Doe"
                            value={form.fullName}
                            onChange={(e) => updateField("fullName", e.target.value)}
                            required
                        />
                        <Input
                            id="email"
                            label="Email Address"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => updateField("email", e.target.value)}
                            required
                        />
                        <Input
                            id="phone"
                            label="Phone Number"
                            type="tel"
                            placeholder="+234 800 000 0000"
                            value={form.phone}
                            onChange={(e) => updateField("phone", e.target.value)}
                            required
                        />
                        <Input
                            id="password"
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => updateField("password", e.target.value)}
                            required
                        />
                        <Input
                            id="confirmPassword"
                            label="Confirm Password"
                            type="password"
                            placeholder="••••••••"
                            value={form.confirmPassword}
                            onChange={(e) => updateField("confirmPassword", e.target.value)}
                            required
                        />

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="pt-1">
                            <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <input type="checkbox" className="mt-0.5 rounded border-gray-300 text-green-500 focus:ring-green-500" required />
                                <span>
                                    I agree to the{" "}
                                    <a href="#" className="text-green-600 hover:underline">Terms of Service</a>
                                    {" "}and{" "}
                                    <a href="#" className="text-green-600 hover:underline">Privacy Policy</a>
                                </span>
                            </label>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Creating account...
                                </span>
                            ) : (
                                "Create Account"
                            )}
                        </Button>
                    </form>
                </div>

                {/* Login Link */}
                <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-green-600 hover:text-green-700 dark:text-green-400 font-semibold">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
