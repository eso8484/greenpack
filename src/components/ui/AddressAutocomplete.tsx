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
  address: string;
  city?: string;
  state?: string;
  lat: number;
  lng: number;
  formatted?: string;
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

const DEBOUNCE_MS = 350;

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

  // Debounced fetch of suggestions whenever the typed value changes.
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
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
          `/api/geocode/suggest?q=${encodeURIComponent(q)}`,
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
        setOpen(list.length > 0);
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
    (s: Suggestion) => {
      justSelectedRef.current = true;
      const display = s.formatted || s.address;
      onChange(display);
      onResolve({
        address: display,
        city: s.city,
        state: s.state,
        lat: s.lat,
        lng: s.lng,
      });
      setOpen(false);
      setSuggestions([]);
      setActiveIndex(-1);
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

        {open && suggestions.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
          >
            {suggestions.map((s, i) => (
              <li
                key={`${s.lat},${s.lng},${i}`}
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
                <span className="text-gray-700 dark:text-gray-200 leading-snug">
                  {s.formatted || s.address}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
