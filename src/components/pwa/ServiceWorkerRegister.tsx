"use client";

import { useEffect } from "react";

const LAST_UPDATE_KEY = "wegen-last-content-update";

/**
 * Registers the service worker and records when content was last
 * saved for offline use (shown in Settings + footer).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const markSaved = () => {
      try {
        window.localStorage.setItem(LAST_UPDATE_KEY, String(Date.now()));
        window.dispatchEvent(new CustomEvent("wg-content-saved"));
      } catch {
        /* storage unavailable */
      }
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // If a worker is already controlling the page, content is cached
        if (navigator.serviceWorker.controller) markSaved();

        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              // New version available — activate quietly on next load
              reg.waiting?.postMessage("WG_SKIP_WAITING");
            }
          });
        });
      })
      .catch(() => undefined);

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "WG_CONTENT_SAVED") markSaved();
    });

    // Also mark once the page has loaded all its text content
    const t = setTimeout(markSaved, 2500);
    return () => clearTimeout(t);
  }, []);

  return null;
}

export function getLastContentUpdate(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LAST_UPDATE_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function isServiceWorkerActive(): boolean {
  if (typeof navigator === "undefined") return false;
  return !!navigator.serviceWorker?.controller;
}
