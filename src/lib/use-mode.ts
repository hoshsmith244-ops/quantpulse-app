"use client";

import * as React from "react";

export type Mode = "simple" | "advanced";

const KEY = "qp:mode";

/**
 * Remembers whether the user prefers the simple or advanced view.
 *
 * Backed by localStorage through useSyncExternalStore rather than an effect:
 * the server snapshot is always "simple", so the first client render matches
 * the server HTML exactly and React applies the stored preference immediately
 * after hydration without a mismatch.
 */
const listeners = new Set<() => void>();

function read(): Mode {
  try {
    return window.localStorage.getItem(KEY) === "advanced"
      ? "advanced"
      : "simple";
  } catch {
    // Private browsing or blocked storage — the default is fine.
    return "simple";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Keep other tabs in step.
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useMode(): [Mode, (m: Mode) => void] {
  const mode = React.useSyncExternalStore(
    subscribe,
    read,
    () => "simple" as const,
  );

  const setMode = React.useCallback((next: Mode) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Not persisting is acceptable; still notify so the UI switches.
    }
    for (const cb of listeners) cb();
  }, []);

  return [mode, setMode];
}
