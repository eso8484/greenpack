"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import type { Delivery } from "@/types";

type Tab = "available" | "active" | "earnings" | "profile";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  assigned: "Assigned to you",
  picking_up: "Picking up from customer",
  at_shop: "At the shop",
  returning: "Returning to customer",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_ACTIONS: Record<string, { label: string; next: string }> = {
  assigned: { label: "Confirm Pickup from Customer", next: "picking_up" },
  picking_up: { label: "Arrived at Shop", next: "at_shop" },
  at_shop: { label: "Collected from Shop — On My Way Back", next: "returning" },
  returning: { label: "Delivered to Customer", next: "delivered" },
};

export default function CourierDashboardPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("available");
  const [availableJobs, setAvailableJobs] = useState<Delivery[]>([]);
  const [activeJobs, setActiveJobs] = useState<Delivery[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Delivery[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [availability, setAvailability] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !["courier", "admin"].includes(profile?.role ?? ""))) {
      router.push("/become-courier");
    }
  }, [user, profile, isLoading, router]);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const [availRes, activeRes, completedRes] = await Promise.all([
        fetch("/api/deliveries/available"),
        fetch("/api/deliveries?status=assigned,picking_up,at_shop,returning"),
        fetch("/api/deliveries?status=delivered"),
      ]);

      const [availData, activeData, completedData] = await Promise.all([
        availRes.json(),
        activeRes.json(),
        completedRes.json(),
      ]);

      if (availData.success) setAvailableJobs(availData.data);
      if (activeData.success) setActiveJobs(activeData.data);
      if (completedData.success) setCompletedJobs(completedData.data);
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadJobs();
  }, [user, loadJobs]);

  const acceptJob = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const res = await fetch(`/api/deliveries/${jobId}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to accept job");
        return;
      }
      toast.success("Job accepted! Get ready to pick up.");
      await loadJobs();
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const updateStatus = async (jobId: string, nextStatus: string) => {
    setActionLoading(jobId);
    try {
      const res = await fetch(`/api/deliveries/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update status");
        return;
      }
      toast.success("Status updated!");
      await loadJobs();
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const totalEarnings = completedJobs.reduce(
    (sum, j) => sum + (j.courier_fee || 0),
    0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Courier Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Welcome back, {profile?.full_name ?? "Courier"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Available</span>
          <button
            onClick={() => setAvailability(!availability)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              availability ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                availability ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-black text-gray-900 dark:text-white">{availableJobs.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Available Jobs</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-black text-gray-900 dark:text-white">{activeJobs.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Active Jobs</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-black text-green-600 dark:text-green-400">{formatPrice(totalEarnings)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Earned</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
        {(["available", "active", "earnings", "profile"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-colors capitalize ${
              activeTab === tab
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loadingJobs ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500" />
        </div>
      ) : (
        <>
          {/* Available jobs */}
          {activeTab === "available" && (
            <div className="space-y-4">
              {availableJobs.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-4xl mb-4 block">🛵</span>
                  <p className="text-gray-500 dark:text-gray-400">No jobs available right now.</p>
                  <p className="text-sm text-gray-400 mt-1">Check back soon!</p>
                </div>
              ) : (
                availableJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    actionLoading={actionLoading}
                    primaryAction={{ label: "Accept Job", onClick: () => acceptJob(job.id) }}
                  />
                ))
              )}
            </div>
          )}

          {/* Active jobs */}
          {activeTab === "active" && (
            <div className="space-y-4">
              {activeJobs.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-4xl mb-4 block">✅</span>
                  <p className="text-gray-500 dark:text-gray-400">No active deliveries.</p>
                </div>
              ) : (
                activeJobs.map((job) => {
                  const action = STATUS_ACTIONS[job.status];
                  return (
                    <JobCard
                      key={job.id}
                      job={job}
                      actionLoading={actionLoading}
                      showStatus
                      primaryAction={
                        action
                          ? { label: action.label, onClick: () => updateStatus(job.id, action.next) }
                          : undefined
                      }
                    />
                  );
                })
              )}
            </div>
          )}

          {/* Earnings */}
          {activeTab === "earnings" && (
            <div>
              <div className="bg-green-500 rounded-2xl p-6 text-white mb-6">
                <p className="text-sm opacity-80 mb-1">Total Earnings</p>
                <p className="text-4xl font-black">{formatPrice(totalEarnings)}</p>
                <p className="text-sm opacity-80 mt-1">{completedJobs.length} completed deliveries</p>
              </div>

              <h3 className="font-bold text-gray-900 dark:text-white mb-3">Completed Deliveries</h3>
              {completedJobs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No completed deliveries yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {completedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          Job #{job.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(job.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-bold text-green-600 dark:text-green-400">
                        +{formatPrice(job.courier_fee)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile tab */}
          {activeTab === "profile" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Your Profile</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Name</span>
                  <span className="font-medium text-gray-900 dark:text-white">{profile?.full_name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Phone</span>
                  <span className="font-medium text-gray-900 dark:text-white">{profile?.phone ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Completed Jobs</span>
                  <span className="font-medium text-gray-900 dark:text-white">{completedJobs.length}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── JobCard sub-component ────────────────────────────────────────────────────

interface JobCardProps {
  job: Delivery;
  actionLoading: string | null;
  showStatus?: boolean;
  primaryAction?: { label: string; onClick: () => void };
}

function JobCard({ job, actionLoading, showStatus, primaryAction }: JobCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">
            Job #{job.id.slice(0, 8).toUpperCase()}
          </p>
          {showStatus && (
            <span className="inline-block mt-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
              {STATUS_LABELS[job.status] ?? job.status}
            </span>
          )}
        </div>
        <p className="font-bold text-green-600 dark:text-green-400">
          {formatPrice(job.courier_fee)}
        </p>
      </div>

      {job.items_description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{job.items_description}</p>
      )}

      <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex gap-2">
          <span className="text-green-500">📍 Pickup:</span>
          <span>{(job.pickup_address as { address?: string })?.address ?? "—"}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-blue-500">🏪 Shop:</span>
          <span>{(job.shop_address as { address?: string })?.address ?? "—"}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-purple-500">🏠 Return to:</span>
          <span>{(job.delivery_address as { address?: string })?.address ?? "—"}</span>
        </div>
      </div>

      {job.special_instructions && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs rounded-lg px-3 py-2 mb-4">
          Note: {job.special_instructions}
        </div>
      )}

      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          disabled={actionLoading === job.id}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {actionLoading === job.id ? "Processing..." : primaryAction.label}
        </button>
      )}
    </div>
  );
}
