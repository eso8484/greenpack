"use client";

/**
 * Minimal client-side Google Maps JS loader (Places library only).
 *
 * Returns null when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY isn't configured, so callers
 * degrade gracefully to plain manual address entry. The script is injected once
 * per page and the promise is cached.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

let loadPromise: Promise<any> | null = null;

export function googleMapsKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

export function loadGoogleMaps(): Promise<any> | null {
  const key = googleMapsKey();
  if (!key || typeof window === "undefined") return null;

  const w = window as any;
  if (w.google?.maps?.places) return Promise.resolve(w.google.maps);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("gmaps-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).google.maps));
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.id = "gmaps-js";
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=places&loading=async`;
    s.onload = () => resolve((window as any).google.maps);
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return loadPromise;
}
