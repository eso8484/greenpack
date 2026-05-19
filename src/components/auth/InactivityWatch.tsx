"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

/**
 * Auto-logout after IDLE_MS of no user input. Mounted near the root so it's
 * always running when there's a session. Resets on mousemove, keypress,
 * touchstart, scroll, and focus — any sign the user is still around.
 *
 * Only active while signed in. When the timer fires it:
 *   1. signs out (global scope so other tabs / sessions are also dropped),
 *   2. shows a toast explaining what happened,
 *   3. redirects to /login so the user has to re-enter credentials.
 *
 * Defaults to 30 minutes. Tune by editing IDLE_MS — there's no env var on
 * purpose because the value should be a deliberate product decision, not a
 * per-deploy knob.
 */
const IDLE_MS = 30 * 60 * 1000; // 30 minutes
const WARN_MS = 60 * 1000; // 1-minute warning toast before logout

export default function InactivityWatch() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const warnTimerRef = useRef<number | null>(null);
  const [warned, setWarned] = useState(false);

  useEffect(() => {
    if (!user) {
      // No session — nothing to time out. Clear any stale timer.
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (warnTimerRef.current) window.clearTimeout(warnTimerRef.current);
      setWarned(false);
      return;
    }

    const scheduleLogout = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (warnTimerRef.current) window.clearTimeout(warnTimerRef.current);
      setWarned(false);

      warnTimerRef.current = window.setTimeout(() => {
        setWarned(true);
        toast.warning(
          "You'll be signed out in 1 minute due to inactivity. Move the mouse to stay signed in."
        );
      }, IDLE_MS - WARN_MS);

      timerRef.current = window.setTimeout(async () => {
        await signOut();
        toast.error("Signed out after 30 minutes of inactivity.");
        router.replace("/login");
      }, IDLE_MS);
    };

    const handleActivity = () => {
      scheduleLogout();
    };

    // Listen for any sign of activity. `passive: true` lets the browser
    // skip preventDefault overhead since we never call it.
    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "focus",
    ];
    events.forEach((ev) =>
      window.addEventListener(ev, handleActivity, { passive: true })
    );

    scheduleLogout();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (warnTimerRef.current) window.clearTimeout(warnTimerRef.current);
    };
    // We intentionally exclude `signOut` and `router` from deps — they're
    // stable across the lifetime of the AuthProvider, and including them
    // would cause the timer to be reset every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Tiny banner shown during the warning window so users notice even if the
  // toast is dismissed by another notification.
  if (!user || !warned) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-xs bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold mb-1">Are you still there?</p>
      <p className="text-xs">You&apos;ll be signed out shortly due to inactivity.</p>
    </div>
  );
}
