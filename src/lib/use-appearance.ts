"use client";

import * as React from "react";

import {
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  applyAppearance,
  sanitiseAppearance,
  type Appearance,
} from "./appearance";

/**
 * Reads and writes the appearance settings.
 *
 * Backed by localStorage through useSyncExternalStore rather than an effect:
 * the server snapshot is always the default, so the first client render matches
 * the server HTML exactly and React applies the stored value straight after
 * hydration without a mismatch. The visible theme does not wait for any of
 * that — the inline script in layout.tsx has already set the attributes before
 * first paint.
 */

const listeners = new Set<() => void>();
let cached: Appearance | null = null;

function read(): Appearance {
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    cached = sanitiseAppearance(raw ? JSON.parse(raw) : null);
  } catch {
    // Private browsing or blocked storage; the default is fine.
    cached = DEFAULT_APPEARANCE;
  }
  return cached;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === APPEARANCE_KEY) {
      cached = null;
      // Another tab changed the theme; match it here too.
      applyAppearance(read());
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAppearance() {
  const appearance = React.useSyncExternalStore(
    subscribe,
    read,
    () => DEFAULT_APPEARANCE,
  );

  const update = React.useCallback((patch: Partial<Appearance>) => {
    const next = sanitiseAppearance({ ...read(), ...patch });
    cached = next;
    // Paint first: the picker should feel instant even if storage is blocked.
    applyAppearance(next);
    try {
      window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
    } catch {
      // Not persisting is acceptable; the session still looks right.
    }
    for (const cb of listeners) cb();
  }, []);

  const reset = React.useCallback(() => {
    cached = DEFAULT_APPEARANCE;
    applyAppearance(DEFAULT_APPEARANCE);
    try {
      window.localStorage.removeItem(APPEARANCE_KEY);
    } catch {
      // As above.
    }
    for (const cb of listeners) cb();
  }, []);

  return { appearance, update, reset };
}
