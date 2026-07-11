"use client";

/**
 * Address input with type-ahead suggestions.
 *
 * As the user types, debounced queries hit `/api/geocode/suggest` and a
 * dropdown of real address matches appears. Selecting one fills the field and
 * fires `onResolve` with the canonical address + coordinates — so callers get a
 * precise lat/lng without ever asking for device GPS.
 *
 * The text value is controlled by the parent (`value`/`onChange`) so it still
 * works as a plain manual-entry field if the user ignores the suggestions or
 * the geocoder returns nothing.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface ResolvedAddress {
  address: string;
  city?: string;
  state?: string;
  lat: number;
  lng: number;
}

interface Suggestion {
  /** Google Places prediction id — coords resolved on select via /details. */
  placeId?: string;
  address?: string;
  city?: string;
  state?: string;
  /** Present only for OSM fallback results (coords known upfront). */
  lat?: number;
  lng?: number;
  formatted?: string;
  /** Structured two-line display (Google). */
  mainText?: string;
  secondaryText?: string;
}

interface AddressAutocompleteProps {
  id?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  /** Plain text edits (typing) — keeps the field controlled by the parent. */
  onChange: (value: string) => void;
  /** Fired when the user picks a suggestion — carries coords + components. */
  onResolve: (resolved: ResolvedAddress) => void;
  /** Optional cleared-coords signal when the user edits after resolving. */
  onClearResolved?: () => void;
  error?: string;
  className?: string;
  inputClassName?: string;
  /** Marks the field as having confirmed coordinates (shows a "Verified" pill). */
  resolved?: boolean;
  disabled?: boolean;
  /** Extra attributes forwarded to the input (e.g. name, autoComplete). */
  name?: string;
}

const DEBOUNCE_MS = 250;
const MIN_QUERY = 3;

/** Opaque session token for Google Places (per-session billing). */
function newSessionToken(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AddressAutocomplete({
  id,
  label,
  required,
  placeholder,
  value,
  onChange,
  onResolve,
  onClearResolved,
  error,
  className,
  inputClassName,
  resolved,
  disabled,
  name,
}: AddressAutocompleteProps) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const listboxId = `${inputId}-suggestions`;

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  // Set true immediately after a selection so the value-change effect doesn't
  // re-open the dropdown with a fresh query for the text we just filled in.
  const justSelectedRef = useRef(false);
  // Google Places session token: groups the keystroke autocomplete calls and
  // the final Place Details call into ONE billing session. Regenerated after
  // each resolved selection so the next address starts a fresh session.
  const sessionTokenRef = useRef<string>(newSessionToken());

  // Debounced fetch of suggestions whenever the typed value changes.
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < MIN_QUERY) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode/suggest?q=${encodeURIComponent(q)}&token=${encodeURIComponent(
            sessionTokenRef.current
          )}`,
          { signal: controller.signal }
        );
        const payload = (await res.json()) as {
          success?: boolean;
          data?: Suggestion[];
        };
        if (cancelled) return;
        const list = payload.success && Array.isArray(payload.data) ? payload.data : [];
        setSuggestions(list);
        setActiveIndex(-1);
        // Open even on zero results so we can show a "no matches" hint instead
        // of a dropdown that silently never appears.
        setOpen(true);
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const select = useCallback(
    async (s: Suggestion) => {
      justSelectedRef.current = true;
      const display = s.formatted || s.address || "";
      onChange(display);
      setOpen(false);
      setSuggestions([]);
      setActiveIndex(-1);

      // OSM fallback results already carry coordinates — resolve immediately.
      if (typeof s.lat === "number" && typeof s.lng === "number") {
        onResolve({ address: display, city: s.city, state: s.state, lat: s.lat, lng: s.lng });
        sessionTokenRef.current = newSessionToken();
        return;
      }

      // Google prediction: fetch exact coords via Place Details, reusing the
      // same session token so autocomplete + details bill as one session.
      if (s.placeId) {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/geocode/details?placeId=${encodeURIComponent(
              s.placeId
            )}&token=${encodeURIComponent(sessionTokenRef.current)}`
          );
          const payload = (await res.json()) as {
            success?: boolean;
            data?: { lat: number; lng: number; formatted?: string; city?: string; state?: string } | null;
          };
          const d = payload.success ? payload.data : null;
          if (d && typeof d.lat === "number" && typeof d.lng === "number") {
            const finalAddress = d.formatted || display;
            onChange(finalAddress);
            onResolve({
              address: finalAddress,
              city: d.city ?? s.city,
              state: d.state ?? s.state,
              lat: d.lat,
              lng: d.lng,
            });
          }
          // If details fail, the field keeps the typed text — manual entry still
          // works; we just don't have confirmed coords.
        } catch {
          /* network error — leave field as manual entry */
        } finally {
          setLoading(false);
          // Start a fresh billing session for the next address.
          sessionTokenRef.current = newSessionToken();
        }
      }
    },
    [onChange, onResolve]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      select(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={cn("space-y-1", className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          required={required}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            if (onClearResolved) onClearResolved();
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          className={cn(
            "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900",
            error &&
              "border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-500 dark:focus:ring-red-900",
            inputClassName
          )}
        />
        {/* status icon: spinner while loading, check once resolved */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <span className="material-symbols-outlined text-base text-gray-400 animate-spin">
              progress_activity
            </span>
          ) : resolved ? (
            <span
              title="Location confirmed"
              className="material-symbols-outlined text-base text-green-600 dark:text-green-400"
            >
              verified
            </span>
          ) : (
            <span className="material-symbols-outlined text-base text-gray-400">
              search
            </span>
          )}
        </span>

        {open &&
          (suggestions.length > 0 ||
            (!loading && value.trim().length >= MIN_QUERY)) && (
            <ul
              id={listboxId}
              role="listbox"
              className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
            >
              {suggestions.length > 0 ? (
                suggestions.map((s, i) => (
                  <li
                    key={s.placeId ?? `${s.lat},${s.lng},${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    // onMouseDown (not onClick) so it fires before the input blur
                    // closes the dropdown.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(s);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      "flex items-start gap-2 px-3 py-2.5 cursor-pointer text-sm",
                      i === activeIndex
                        ? "bg-green-50 dark:bg-green-900/30"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    )}
                  >
                    <span className="material-symbols-outlined text-base text-green-600 dark:text-green-400 mt-0.5">
                      location_on
                    </span>
                    {s.mainText ? (
                      <span className="leading-snug">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {s.mainText}
                        </span>
                        {s.secondaryText && (
                          <span className="text-gray-500 dark:text-gray-400">
                            {" "}
                            {s.secondaryText}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-700 dark:text-gray-200 leading-snug">
                        {s.formatted || s.address}
                      </span>
                    )}
                  </li>
                ))
              ) : (
                <li className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 leading-snug">
                  No matches yet — keep typing, or just enter your address
                  manually.
                </li>
              )}
            </ul>
          )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
