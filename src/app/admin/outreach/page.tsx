"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Vendor image outreach — the admin half of the listing rule.
//
// A shop is displayable only with a thumbnail, a banner, and at least one
// gallery image (migration 021, `shops.images_complete`). 91 of 95 production
// shops do not meet that bar, and the vendor is only told about it on pages they
// have to open. This page emails the ones who did not come back.
//
// The list comes from the API, which reads `images_complete` in SQL. Nothing
// here re-derives it: `missing` is a description of a verdict already made, and
// the filter pills and the search box narrow the fetched array rather than
// changing who is eligible.

type MissingPiece = "thumbnail" | "banner" | "gallery";

type OutreachShop = {
  id: string;
  name: string;
  slug: string | null;
  ownerName: string | null;
  email: string | null;
  missing: MissingPiece[];
  lastEmailedAt: string | null;
  lastEmailedTo: string | null;
  emailCount: number;
};

type Counts = { unlisted: number; neverEmailed: number; emailed: number };

const PIECE_LABEL: Record<MissingPiece, string> = {
  thumbnail: "thumbnail",
  banner: "banner",
  gallery: "gallery image",
};

/** The chunk size both the client and the API's zod cap agree on. */
const CHUNK_SIZE = 20;

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function describeMissing(missing: MissingPiece[]): string {
  if (missing.length === 0) return "images complete";
  return missing.map((piece) => PIECE_LABEL[piece]).join(", ");
}

export default function AdminOutreachPage() {
  const [shops, setShops] = useState<OutreachShop[]>([]);
  const [counts, setCounts] = useState<Counts>({ unlisted: 0, neverEmailed: 0, emailed: 0 });
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const [filter, setFilter] = useState<"all" | "never" | "emailed">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // What the confirm modal is asking about. Nothing is sent while this is unset.
  const [pending, setPending] = useState<OutreachShop[] | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/outreach");
      const json = await res.json();
      if (json.success) {
        setShops(json.data.shops);
        setCounts(json.data.counts);
        setEmailConfigured(json.data.emailConfigured);
        // A shop that got emailed (or was deleted) should not stay selected.
        setSelected((prev) => {
          const live = new Set<string>(json.data.shops.map((s: OutreachShop) => s.id));
          return new Set(Array.from(prev).filter((id) => live.has(id)));
        });
      } else {
        toast.error("Failed to load the outreach queue");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return shops.filter((shop) => {
      if (filter === "never" && shop.emailCount > 0) return false;
      if (filter === "emailed" && shop.emailCount === 0) return false;
      if (!needle) return true;
      return (
        shop.name.toLowerCase().includes(needle) ||
        (shop.ownerName ?? "").toLowerCase().includes(needle) ||
        (shop.email ?? "").toLowerCase().includes(needle)
      );
    });
  }, [shops, filter, search]);

  const selectable = visible.filter((shop) => shop.email !== null);
  const allSelected = selectable.length > 0 && selectable.every((shop) => selected.has(shop.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) selectable.forEach((shop) => next.delete(shop.id));
      else selectable.forEach((shop) => next.add(shop.id));
      return next;
    });
  }

  /** Send to a set of shops, in chunks, reporting what actually happened. */
  async function runSend(targets: OutreachShop[]) {
    const mailable = targets.filter((shop) => shop.email !== null);
    if (mailable.length === 0) {
      toast.error("None of those shops has an address on file.");
      return;
    }

    setPending(null);
    setBusy(true);

    const chunks: OutreachShop[][] = [];
    for (let i = 0; i < mailable.length; i += CHUNK_SIZE) {
      chunks.push(mailable.slice(i, i + CHUNK_SIZE));
    }

    const sent: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) {
          setProgress(`Sending ${i + 1} of ${chunks.length}…`);
        }
        const chunk = chunks[i]!;
        try {
          const res = await fetch("/api/admin/outreach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "send", shopIds: chunk.map((shop) => shop.id) }),
          });
          const json = await res.json();
          if (!json.success) {
            // A whole chunk failing is the rate limit or the transport, not one
            // bad address — report it rather than counting it as sent.
            failed.push(...chunk.map((shop) => shop.name));
            toast.error(typeof json.error === "string" ? json.error : "A batch failed to send.");
            continue;
          }
          sent.push(...json.data.sent.map((s: { shopName: string }) => s.shopName));
          failed.push(...json.data.failed.map((f: { shopName: string }) => f.shopName));
          skipped.push(...json.data.skipped.map((s: { shopName: string }) => s.shopName));
        } catch {
          failed.push(...chunk.map((shop) => shop.name));
        }
      }
    } finally {
      setProgress(null);
      setBusy(false);
      setSelected(new Set());
      await load();
    }

    // Honest by construction: a partial send must never read as a full one.
    const parts = [`Sent to ${sent.length}`];
    if (failed.length > 0) parts.push(`${failed.length} failed`);
    if (skipped.length > 0) parts.push(`${skipped.length} skipped`);

    if (sent.length > 0 && failed.length === 0 && skipped.length === 0) {
      toast.success(parts.join(" · "));
    } else if (sent.length > 0) {
      toast.warning(parts.join(" · "), {
        description: failed.length > 0 ? `Failed: ${failed.slice(0, 5).join(", ")}` : undefined,
      });
    } else {
      toast.error(parts.join(" · "), {
        description: failed.length > 0 ? `Failed: ${failed.slice(0, 5).join(", ")}` : undefined,
      });
    }
  }

  /** Send one sample to the admin's own inbox. Writes no send history. */
  async function runTest(shopId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "test", shopId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Test sent to ${json.data.to}`, {
          description: "Nothing was sent to any vendor, and no send was recorded.",
        });
      } else {
        toast.error(typeof json.error === "string" ? json.error : "Test send failed.");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function runTestOnAny() {
    const first = shops[0];
    if (!first) {
      toast.error("There is no unlisted shop to preview.");
      return;
    }
    await runTest(first.id);
  }

  const selectedShops = shops.filter((shop) => selected.has(shop.id));

  return (
    <div className="min-h-screen bg-[#f9fafb] dark:bg-gray-900 pb-24">
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link
            href="/admin"
            className="text-sm text-green-600 dark:text-green-400 hover:underline"
          >
            ← Admin
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight mt-2">
            Image outreach
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Shops that customers cannot find yet, because they are missing a thumbnail, a banner, or
            a gallery image. Email the vendor and tell them what to upload.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
            <span>
              <strong className="text-gray-900 dark:text-white">{counts.unlisted}</strong> unlisted
            </span>
            <span aria-hidden>·</span>
            <span>
              <strong className="text-gray-900 dark:text-white">{counts.neverEmailed}</strong> never
              emailed
            </span>
            <span aria-hidden>·</span>
            <span>
              <strong className="text-gray-900 dark:text-white">{counts.emailed}</strong> emailed
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runTestOnAny}
              disabled={busy || loading || !emailConfigured || shops.length === 0}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send a test to myself
            </button>
            <button
              type="button"
              onClick={() => setPending(shops.filter((shop) => shop.emailCount === 0 && shop.email !== null))}
              disabled={busy || loading || !emailConfigured || counts.neverEmailed === 0}
              className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Email all {counts.neverEmailed} not yet emailed
            </button>
          </div>

          {!emailConfigured && (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              Email delivery is not configured, so nothing can be sent from here. Set{" "}
              <code className="font-mono text-xs">RESEND_API_KEY</code>, or{" "}
              <code className="font-mono text-xs">SMTP_HOST</code>/
              <code className="font-mono text-xs">SMTP_USER</code>/
              <code className="font-mono text-xs">SMTP_PASS</code>.
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {(
            [
              { key: "all", label: "All", count: counts.unlisted },
              { key: "never", label: "Never emailed", count: counts.neverEmailed },
              { key: "emailed", label: "Emailed", count: counts.emailed },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === tab.key
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-75">({tab.count})</span>
            </button>
          ))}

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shop, owner, or address"
            className="ml-auto w-full sm:w-72 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            {shops.length === 0
              ? "Every shop has its images. Nothing to send."
              : "No shops match this filter."}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAllVisible}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Select all shown ({selectable.length})
              </label>
            </div>

            <div className="space-y-3">
              {visible.map((shop) => {
                const reachable = shop.email !== null;
                return (
                  <motion.div
                    key={shop.id}
                    layout
                    className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 flex items-start gap-4"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(shop.id)}
                      onChange={() => toggle(shop.id)}
                      disabled={!reachable}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-40"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {shop.name}
                      </p>

                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {shop.ownerName ?? "No owner name"}
                        {" · "}
                        {reachable ? (
                          <span className="text-gray-700 dark:text-gray-300">{shop.email}</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            no address on file
                          </span>
                        )}
                      </p>

                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span className="text-gray-400 dark:text-gray-500">missing: </span>
                        {describeMissing(shop.missing)}
                      </p>

                      <p className="text-xs mt-1">
                        {shop.emailCount === 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium">
                            Not yet emailed
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            Emailed {shop.lastEmailedAt ? fmt(shop.lastEmailedAt) : "previously"}
                            {shop.emailCount > 1 ? ` · ${shop.emailCount}×` : ""}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPending([shop])}
                        disabled={busy || !reachable || !emailConfigured}
                        title={reachable ? undefined : "This shop has no address on file."}
                        className="px-4 py-1.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Send
                      </button>
                      <button
                        type="button"
                        onClick={() => runTest(shop.id)}
                        disabled={busy || !emailConfigured}
                        className="px-4 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Test
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bulk bar — only when something is selected */}
      <AnimatePresence>
        {selectedShops.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedShops.length} selected
              </span>
              <button
                type="button"
                onClick={() => setPending(selectedShops)}
                disabled={busy || !emailConfigured}
                className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send to {selectedShops.length} {selectedShops.length === 1 ? "vendor" : "vendors"}
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:underline"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress while a chunked run is in flight */}
      <AnimatePresence>
        {progress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          >
            <div className="rounded-2xl bg-white dark:bg-gray-800 px-6 py-5 shadow-xl flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{progress}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The confirm modal — nothing real is sent without passing through here */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={(e) => e.target === e.currentTarget && setPending(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl"
            >
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Email {pending.length} {pending.length === 1 ? "vendor" : "vendors"}?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                This sends a real email and records it in the send history.
              </p>

              <ul className="mt-4 max-h-48 overflow-y-auto text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {pending.slice(0, 10).map((shop) => (
                  <li key={shop.id} className="truncate">
                    <span className="text-gray-900 dark:text-white">{shop.name}</span>
                    {" — "}
                    {shop.email}
                  </li>
                ))}
              </ul>
              {pending.length > 10 && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  and {pending.length - 10} more
                </p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => runSend(pending)}
                  className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                >
                  Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
