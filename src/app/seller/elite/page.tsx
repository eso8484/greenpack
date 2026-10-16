"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";

/**
 * Become an Elite Partner — the vendor's half of the elite tier.
 *
 * The tier is *applied for*, never claimed at registration, which is the whole
 * reason it reads as earned rather than bought. Nothing on this page can grant
 * it: the form files an application, an admin reviews it, and only the service
 * role can set `shops.is_elite`.
 *
 * The copy here carries three of the fairness invariants deliberately, because
 * this is the one screen where a vendor who is *not* elite will read about the
 * tier:
 *
 *   1. It costs nothing. There is no fee, no commission change, no payment step.
 *   2. The criteria are published on this page, so "why them and not me" has an
 *      answer that is not "because they knew someone".
 *   3. A rejection explains itself and can be reapplied to. Being turned down is
 *      a "not yet", not a closed door.
 */

const MIN_PITCH = 80;
const MAX_PITCH = 2000;

type ApplicationStatus = "pending" | "approved" | "rejected";

interface EliteApplication {
  id: string;
  status: ApplicationStatus;
  pitch: string;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface EliteData {
  shop: { id: string; name: string; isElite: boolean };
  application: EliteApplication | null;
}

/**
 * The published bar. Every line is something a vendor can actually go and do,
 * which is what keeps the tier from reading as a judgement about the person.
 */
const CRITERIA = [
  {
    icon: "verified",
    title: "A certified shop",
    body: "Your shop is verified on GreenPack, with complete details and real photos or a video — no stock images standing in for the business.",
  },
  {
    icon: "star",
    title: "A rating of 4.5 or higher",
    body: "Earned from a meaningful number of customer reviews. A handful of five-star ratings from the same week does not clear the bar.",
  },
  {
    icon: "forum",
    title: "A contact line that answers",
    body: "Phone, WhatsApp, or the inquiry form — someone replies, and replies promptly. We check before we approve.",
  },
  {
    icon: "history",
    title: "A track record on GreenPack",
    body: "A shop that has been live and trading for a while. Elite placement goes to businesses with something to judge, not to brand-new listings.",
  },
];

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SellerElitePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EliteData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pitch, setPitch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/seller/elite", {
          credentials: "include",
        });
        const json = await res.json();

        if (res.ok && json.success && json.data) {
          if (!cancelled) setData(json.data as EliteData);
        } else if (!cancelled) {
          setLoadError(
            typeof json.error === "string"
              ? json.error
              : "Could not load your application status"
          );
        }
      } catch {
        if (!cancelled) setLoadError("Could not load your application status");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (pitch.trim().length < MIN_PITCH) {
      toast.error(`Tell us a bit more — at least ${MIN_PITCH} characters.`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/seller/elite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch: pitch.trim() }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        const msg =
          typeof json.error === "string"
            ? json.error
            : "Could not submit your application";
        throw new Error(msg);
      }

      setData((prev) =>
        prev
          ? { ...prev, application: json.data as EliteApplication }
          : prev
      );
      setPitch("");
      toast.success("Application received — we'll review it shortly.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not submit your application"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Loading your application...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Elite Partner
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          {loadError ?? "Could not load your application status."}
        </p>
        <div className="mt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const { shop, application } = data;
  const isElite = shop.isElite || application?.status === "approved";
  const isPending = !isElite && application?.status === "pending";
  const isRejected = !isElite && application?.status === "rejected";
  const canApply = !isElite && !isPending;
  const pitchLength = pitch.trim().length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Elite Partner
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Homepage placement for shops that have earned it. Free, reviewed by a
          person, and open to every vendor on GreenPack.
        </p>
      </div>

      {/* ── Status ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your status
          </h2>
          {isElite && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-semibold">
              <span className="material-symbols-outlined text-[15px] fill-1">
                workspace_premium
              </span>
              Elite Partner
            </span>
          )}
          {isPending && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
              Under review
            </span>
          )}
          {isRejected && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
              Not approved
            </span>
          )}
          {!isElite && !isPending && !isRejected && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
              Not applied
            </span>
          )}
        </div>

        {isElite && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">
                {shop.name}
              </span>{" "}
              is an Elite Partner. Your shop leads the homepage hero carousel,
              the featured listings, and wears the Elite Partner badge wherever
              it appears.
            </p>
            {application?.reviewed_at && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Approved {formatDate(application.reviewed_at)}.
              </p>
            )}
          </div>
        )}

        {isPending && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your application for{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {shop.name}
              </span>{" "}
              is with our team. You will see the outcome here — we do not leave
              applications sitting.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Submitted {formatDate(application?.created_at ?? null)}.
            </p>
          </div>
        )}

        {isRejected && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your last application was not approved this time. That is a
              &ldquo;not yet&rdquo;, not a &ldquo;no&rdquo; — you can apply
              again as soon as the gap below is closed.
            </p>
            {application?.review_note && (
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm rounded-lg px-3 py-2.5">
                <span className="font-semibold">Reviewer&rsquo;s note: </span>
                {application.review_note}
              </div>
            )}
            {application?.reviewed_at && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Reviewed {formatDate(application.reviewed_at)}.
              </p>
            )}
          </div>
        )}

        {!isElite && !isPending && !isRejected && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You have not applied yet. Nothing about your shop changes while you
            are not an Elite Partner — you stay in browse, search, and every
            other listing exactly as you are today. Elite adds homepage
            placement on top.
          </p>
        )}
      </div>

      {/* ── Application form ── */}
      {canApply && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {isRejected ? "Apply again" : "Apply to become an Elite Partner"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Tell us about your business in your own words — what you sell, how
            long you have been trading, and how you look after customers. A
            person reads every application.
          </p>

          <label
            htmlFor="elite-pitch"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            About your business
          </label>
          <textarea
            id="elite-pitch"
            rows={7}
            maxLength={MAX_PITCH}
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="We run a phone repair and accessories shop in Ikeja. We have been on GreenPack for two years and handle around forty repairs a month, mostly screens and batteries..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-green-500 resize-y"
          />
          <div className="flex items-center justify-between mt-2">
            <span
              className={`text-xs ${
                pitchLength > 0 && pitchLength < MIN_PITCH
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {pitchLength < MIN_PITCH
                ? `${MIN_PITCH - pitchLength} more characters needed`
                : "Looks good — a person will read this."}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {pitchLength}/{MAX_PITCH}
            </span>
          </div>

          <div className="mt-5">
            <Button type="submit" disabled={saving || pitchLength < MIN_PITCH}>
              {saving ? "Submitting..." : "Submit application"}
            </Button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Applying costs nothing and commits you to nothing. Being an Elite
            Partner does not change what you are charged.
          </p>
        </form>
      )}

      {/* ── The published bar ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          What we look for
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          These are the same four things for every shop, and they are the only
          things that decide it. There is no fee that shortens the queue and no
          way to buy your way in.
        </p>

        <ul className="space-y-4">
          {CRITERIA.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[20px] mt-0.5 shrink-0">
                {item.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            <span className="font-semibold text-gray-900 dark:text-white">
              What Elite actually changes: placement, and nothing else.
            </span>{" "}
            Elite shops are shown first on the homepage — the hero carousel and
            the featured listings. Every other shop keeps its place in browse,
            search, the trending list, and the discovery wall. Nobody is hidden
            to make room; the promoted list is simply ordered, and it is short.
          </p>
        </div>
      </div>
    </div>
  );
}
