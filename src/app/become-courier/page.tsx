"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const benefits = [
  { icon: "💰", title: "Earn Extra Income", desc: "Make ₦2,000–₦8,000+ daily delivering for local businesses" },
  { icon: "🕐", title: "Flexible Hours", desc: "Work whenever you want — morning, afternoon, or evening" },
  { icon: "🏍️", title: "Use Your Vehicle", desc: "Work with your bike, car, or bicycle" },
  { icon: "📱", title: "Easy Dashboard", desc: "Accept jobs and track earnings from your phone" },
];

export default function BecomeCourierPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [step, setStep] = useState<"info" | "form" | "success">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    vehicleType: "bike" as "bike" | "car" | "bicycle",
    nin: "",
    guarantorName: "",
    guarantorPhone: "",
    areaOfOperation: "",
    availabilityHours: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in first to apply as a courier");
      router.push("/login?redirect=/become-courier");
      return;
    }

    if (!form.nin.trim() || !form.guarantorName.trim() || !form.guarantorPhone.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/couriers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_type: form.vehicleType,
          nin: form.nin,
          guarantor_name: form.guarantorName,
          guarantor_phone: form.guarantorPhone,
          area_of_operation: form.areaOfOperation,
          availability_hours: form.availabilityHours,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Application failed");
        setIsSubmitting(false);
        return;
      }

      setStep("success");
    } catch {
      toast.error("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎉</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">
            Application Submitted!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Thank you for applying to be a GreenPack courier.
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            We&apos;ll review your application and contact you within <strong>24 hours</strong> via phone or WhatsApp.
          </p>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-8 text-left">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">What happens next?</p>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>Our team reviews your application</li>
              <li>We verify your NIN and guarantor details</li>
              <li>Brief phone interview</li>
              <li>Account activated — start earning!</li>
            </ol>
          </div>
          <Link
            href="/"
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (step === "info") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <span className="material-symbols-outlined text-base">local_shipping</span>
            Become a Courier
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
            Earn Money Delivering <br />
            <span className="text-green-500">for Local Businesses</span>
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Join the GreenPack courier network. Pick up items from customers,
            deliver to shops, and return completed orders — all on your schedule.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6"
            >
              <span className="text-3xl mb-3 block">{b.icon}</span>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{b.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            How GreenPack Delivery Works
          </h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Customer places order", desc: "Customer requests pickup & delivery at checkout" },
              { step: "2", title: "You accept the job", desc: "Nearby couriers are notified — first to accept gets the job" },
              { step: "3", title: "Pick up from customer", desc: "Go to the customer's address and collect the item" },
              { step: "4", title: "Deliver to shop", desc: "Drop off the item at the listed shop/vendor" },
              { step: "5", title: "Return completed order", desc: "Pick up finished order from shop, return to customer" },
              { step: "6", title: "Get paid", desc: "Earnings added to your wallet instantly after completion" },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Earnings */}
        <div className="bg-green-500 rounded-2xl p-8 text-white mb-10">
          <h2 className="text-xl font-bold mb-4">Courier Earnings</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black">₦600</p>
              <p className="text-sm opacity-80">Short distance (&lt;3km)</p>
            </div>
            <div>
              <p className="text-2xl font-black">₦1,200</p>
              <p className="text-sm opacity-80">Medium (3–8km)</p>
            </div>
            <div>
              <p className="text-2xl font-black">₦2,400</p>
              <p className="text-sm opacity-80">Long distance (8km+)</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => setStep("form")}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-xl text-lg shadow-lg shadow-green-500/20 transition-all"
          >
            Apply Now — It&apos;s Free
          </button>
          <p className="text-sm text-gray-400 mt-3">Takes less than 5 minutes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="mb-8">
        <button
          onClick={() => setStep("info")}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 mb-4"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">
          Courier Application
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Fill in your details to get started
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        {!user && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              You need to be logged in to apply.{" "}
              <Link href="/login?redirect=/become-courier" className="font-semibold underline">
                Sign in here
              </Link>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Pre-filled from profile */}
          {profile && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm">
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Your Account</p>
              <p className="text-gray-500 dark:text-gray-400">{profile.full_name}</p>
            </div>
          )}

          {/* Vehicle Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Vehicle Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["bike", "car", "bicycle"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateField("vehicleType", v)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors capitalize ${
                    form.vehicleType === v
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                      : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {v === "bike" ? "🏍️" : v === "car" ? "🚗" : "🚲"} {v}
                </button>
              ))}
            </div>
          </div>

          {/* NIN */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              NIN (National Identification Number) *
            </label>
            <input
              type="text"
              required
              value={form.nin}
              onChange={(e) => updateField("nin", e.target.value)}
              placeholder="Enter your 11-digit NIN"
              maxLength={11}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
            />
          </div>

          {/* Guarantor */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Guarantor Full Name *
            </label>
            <input
              type="text"
              required
              value={form.guarantorName}
              onChange={(e) => updateField("guarantorName", e.target.value)}
              placeholder="Full name of your guarantor"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Guarantor Phone Number *
            </label>
            <input
              type="tel"
              required
              value={form.guarantorPhone}
              onChange={(e) => updateField("guarantorPhone", e.target.value)}
              placeholder="+234 800 000 0000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
            />
          </div>

          {/* Area of operation */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Area of Operation
            </label>
            <input
              type="text"
              value={form.areaOfOperation}
              onChange={(e) => updateField("areaOfOperation", e.target.value)}
              placeholder="e.g. Lekki, Lagos Island, Surulere"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
            />
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Preferred Availability Hours
            </label>
            <input
              type="text"
              value={form.availabilityHours}
              onChange={(e) => updateField("availabilityHours", e.target.value)}
              placeholder="e.g. Weekdays 8am–6pm"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !user}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 cursor-pointer text-sm mt-2"
          >
            {isSubmitting ? "Submitting application..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}
