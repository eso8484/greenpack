"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type AppStatus = "pending" | "approved" | "rejected";

type EliteApplication = {
  id: string;
  shop_id: string;
  status: AppStatus;
  pitch: string;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  shop: {
    id: string;
    name: string;
    slug: string;
    category_name: string | null;
    is_elite: boolean;
    is_verified: boolean;
    rating: number;
    review_count: number;
  } | null;
  applicant: {
    id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
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

export default function AdminVendorsPage() {
  const [applications, setApplications] = useState<EliteApplication[]>([]);
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
        filter === "all" ? "/api/admin/vendors" : `/api/admin/vendors?status=${filter}`;
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
      const res = await fetch(`/api/admin/vendors/${actionTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionTarget.action, note: note || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          actionTarget.action === "approve"
            ? `${actionTarget.name} is now an Elite Partner`
            : `${actionTarget.name}'s application was not approved`
        );
        setActionTarget(null);
        setNote("");
        setExpanded(null);
        load();
      } else {
        toast.error(typeof json.error === "string" ? json.error : "Action failed. Try again.");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const counts = applications.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
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
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Elite Applications
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Homepage placement, granted by review and never sold
              </p>
            </div>
            <a
              href="/admin"
              className="text-sm text-green-600 dark:text-green-400 hover:underline"
            >
              ← Admin
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
                  <span className="ml-1.5 text-xs opacity-75">({counts[tab.key]})</span>
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
                onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                className="w-full text-left px-5 py-4 flex items-center gap-4"
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-300 font-bold text-sm">
                  {app.shop?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {app.shop?.name ?? "Unknown shop"}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(
                        app.status
                      )}`}
                    >
                      {app.status}
                    </span>
                    {/* The flag can be true while the row is not this
                        application's doing — an earlier approval, or a retry.
                        Showing it stops a reviewer reading "pending" as "not
                        elite" and re-deciding a shop that already leads the
                        homepage. */}
                    {app.shop?.is_elite && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-600 text-white">
                        Elite
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {app.shop?.category_name ?? "Uncategorised"} &middot; Applied{" "}
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
                      {/* The vendor's own words, kept as written — a pitch is
                          the applicant's account of their shop, and the
                          reviewer's job is to judge it, not tidy it. */}
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 font-semibold mb-1">
                          Their pitch
                        </p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {app.pitch}
                        </p>
                      </div>

                      {/* The published criteria, shown next to the evidence a
                          reviewer is meant to weigh against them. These are the
                          same numbers the vendor sees on /seller/elite, so a
                          decision can be explained by pointing at them. */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <Detail
                          label="Rating"
                          value={
                            app.shop
                              ? `${Number(app.shop.rating).toFixed(1)} (${app.shop.review_count} reviews)`
                              : "—"
                          }
                        />
                        <Detail
                          label="Certified"
                          value={app.shop?.is_verified ? "Yes" : "No"}
                        />
                        <Detail
                          label="Storefront"
                          value={app.shop?.slug ? `/shop/${app.shop.slug}` : "—"}
                        />
                        <Detail label="Contact" value={app.applicant?.phone ?? "—"} />
                        <Detail label="Account" value={app.applicant?.full_name ?? "—"} />
                        <Detail label="Applied" value={fmt(app.created_at)} />
                      </div>

                      {app.review_note && (
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            Review note:{" "}
                          </span>
                          {app.review_note}
                          {app.reviewer?.full_name && (
                            <span className="text-gray-400 dark:text-gray-500">
                              {" "}
                              — {app.reviewer.full_name}
                              {app.reviewed_at ? `, ${fmt(app.reviewed_at)}` : ""}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions — only for pending */}
                      {app.status === "pending" && (
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={() =>
                              setActionTarget({
                                id: app.id,
                                action: "approve",
                                name: app.shop?.name ?? "This shop",
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
                                name: app.shop?.name ?? "This shop",
                              })
                            }
                            className="flex-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold py-2 rounded-lg text-sm transition-colors"
                          >
                            Not yet
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
                {actionTarget.action === "approve" ? "Approve" : "Decline"} Application
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {actionTarget.action === "approve"
                  ? `${actionTarget.name} joins the homepage's Elite Partners. The shop keeps every other listing it has.`
                  : `${actionTarget.name} stays listed and keeps every section it has today. Nothing is removed — write the reason below so they know what to close.`}
              </p>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note{" "}
                <span className="text-gray-400 font-normal">
                  {actionTarget.action === "approve" ? "(optional)" : "(sent to the vendor)"}
                </span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={
                  actionTarget.action === "approve"
                    ? "Welcome message or instructions..."
                    : "Which criterion to close before applying again..."
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
                    : "Confirm Decline"}
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
