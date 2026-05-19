"use client";

import { useEffect, useRef, useState } from "react";
import type { Suggestion } from "@/app/api/search/suggest/route";

interface State {
  suggestions: Suggestion[];
  isLoading: boolean;
}

const EMPTY: State = { suggestions: [], isLoading: false };

/**
 * Debounced fetch against /api/search/suggest. Aborts pending requests when
 * the query changes so we never render stale results, and skips network when
 * the query is shorter than `minLength` (default 1).
 *
 * Implementation note: the below-threshold case derives the empty state
 * during render rather than calling setState in the effect — this keeps the
 * hook compatible with React 19's `react-hooks/set-state-in-effect` lint
 * rule while preserving the same observable behavior.
 */
export function useSearchSuggestions(query: string, opts: { minLength?: number; delayMs?: number } = {}): State {
  const minLength = opts.minLength ?? 1;
  const delayMs = opts.delayMs ?? 200;

  const trimmed = query.trim();
  const active = trimmed.length >= minLength;

  const [state, setState] = useState<State>(EMPTY);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!active) {
      controllerRef.current?.abort();
      controllerRef.current = null;
      return;
    }

    const debounceId = window.setTimeout(async () => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setState({ suggestions: [], isLoading: true });

      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          if (!controller.signal.aborted) setState(EMPTY);
          return;
        }
        const json = (await res.json()) as { success?: boolean; data?: Suggestion[] };
        if (controller.signal.aborted) return;
        setState({
          suggestions: Array.isArray(json.data) ? json.data : [],
          isLoading: false,
        });
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setState(EMPTY);
      }
    }, delayMs);

    return () => {
      window.clearTimeout(debounceId);
    };
  }, [trimmed, active, delayMs]);

  // When the query falls below threshold, render an empty state immediately
  // even if `state` still holds stale results from a previous query.
  return active ? state : EMPTY;
}
