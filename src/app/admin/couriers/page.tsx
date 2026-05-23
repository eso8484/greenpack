"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type AppStatus = "pending" | "approved" | "rejected";

type CourierApplication = {
  id: string;
  vehicle_type: string;
  application_status: AppStatus;
  is_verified: boolean;
  nin: string | null;
  guarantor_name: string | null;
  guarantor_phone: string | null;
  area_of_operation: string | null;
  availability_hours: string | null;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  applicant: { id: string; full_name: string | null; phone: string | null } | null;
  reviewer: { id: string; full_name: string | null } | null;
};

const STATUS_TABS: { key: "all" | AppStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function statusBadge(status: AppStatus) {
  if (status === "approved")
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (status === "rejected")
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminCouriersPage() {
  const [applications, setApplications] = useState<CourierApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | AppStatus>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    action: "approve" | "reject";
    name: string;
  } | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const url =
        filter === "all"
          ? "/api/admin/couriers"
          : `/api/admin/couriers?status=${filter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setApplications(json.data);
      else toast.error("Failed to load applications");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitReview() {
    if (!actionTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/couriers/${actionTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionTarget.action, note: note || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          actionTarget.action === "approve"
            ? `${actionTarget.name} approved as courier`
            : `${actionTarget.name}'s application rejected`
        );
        setActionTarget(null);
        setNote("");
        setExpanded(null);
        load();
      } else {
        toast.error("Action failed. Try again.");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const counts = applications.reduce(
    (acc, a) => {
      acc[a.application_status] = (acc[a.application_status] ?? 0) + 1;
      return acc;
    },
    {} as Record<AppStatus, number>
  );

  return (
    <div className="min-h-screen bg-[#f9fafb] dark:bg-gray-900 pb-16">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Courier Applications
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Review and approve courier registrations
              </p>
            </div>
            <a
              href="/admin/support"
              className="text-sm text-green-600 dark:text-green-400 hover:underline"
            >
              ← Support Console
            </a>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 mt-5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {tab.label}
                {tab.key !== "all" && counts[tab.key] ? (
                  <span className="ml-1.5 text-xs opacity-75">
                    ({counts[tab.key]})
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            No {filter === "all" ? "" : filter} applications
          </div>
        ) : (
          applications.map((app) => (
            <motion.div
              key={app.id}
              layout
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
            >
              {/* Row */}
              <button
                onClick={() =>
                  setExpanded(expanded === app.id ? null : app.id)
                }
                className="w-full text-left px-5 py-4 flex items-center gap-4"
              >
                {/* Avatar */}
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-300 font-bold text-sm">
                  {app.applicant?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {app.applicant?.full_name ?? "Unknown"}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(
                        app.application_status
                      )}`}
                    >
                      {app.application_status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {app.applicant?.phone ?? "No phone"} &middot;{" "}
                    {app.vehicle_type.replace("_", " ")} &middot; Applied{" "}
                    {fmt(app.created_at)}
                  </p>
                </div>

                <svg
                  className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${
                    expanded === app.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Expanded Details */}
              <AnimatePresence>
                {expanded === app.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <Detail label="NIN" value={app.nin ?? "—"} />
                        <Detail
                          label="Guarantor"
                          value={app.guarantor_name ?? "—"}
                        />
                        <Detail
                          label="Guarantor Phone"
                          value={app.guarantor_phone ?? "—"}
                        />
                        <Detail
                          label="Area of Operation"
                          value={app.area_of_operation ?? "—"}
                        />
                        <Detail
                          label="Availability"
                          value={app.availability_hours ?? "—"}
                        />
                        <Detail
                          label="Vehicle"
                          value={app.vehicle_type.replace("_", " ")}
                        />
                      </div>

                      {/* Review note if already reviewed */}
                      {app.review_note && (
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            Review note:{" "}
                          </span>
                          {app.review_note}
                        </div>
                      )}

                      {/* Actions — only for pending */}
                      {app.application_status === "pending" && (
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={() =>
                              setActionTarget({
                                id: app.id,
                                action: "approve",
                                name: app.applicant?.full_name ?? "Courier",
                              })
                            }
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              setActionTarget({
                                id: app.id,
                                action: "reject",
                                name: app.applicant?.full_name ?? "Courier",
                              })
                            }
                            className="flex-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold py-2 rounded-lg text-sm transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Confirm Modal */}
      <AnimatePresence>
        {actionTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={(e) => e.target === e.currentTarget && setActionTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {actionTarget.action === "approve" ? "Approve" : "Reject"}{" "}
                Application
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {actionTarget.action === "approve"
                  ? `${actionTarget.name} will be granted courier access immediately.`
                  : `${actionTarget.name}'s application will be rejected.`}
              </p>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={
                  actionTarget.action === "approve"
                    ? "Welcome message or instructions..."
                    : "Reason for rejection..."
                }
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-800 mb-4 resize-none"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setActionTarget(null);
                    setNote("");
                  }}
                  className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  disabled={submitting}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                    actionTarget.action === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {submitting
                    ? "Saving..."
                    : actionTarget.action === "approve"
                    ? "Confirm Approve"
                    : "Confirm Reject"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 font-semibold mb-0.5">
        {label}
      </p>
      <p className="text-gray-800 dark:text-gray-200 font-medium">{value}</p>
    </div>
  );
}
