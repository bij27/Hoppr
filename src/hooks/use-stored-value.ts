import { useCallback, useSyncExternalStore } from 'react';

import { kv } from '@/lib/kv';

const listeners = new Set<() => void>();
/** Write-through cache, so values still work this session if device storage is unavailable. */
const memory = new Map<string, string | null>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return kv?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Writes a saved value (null removes it) and updates every component using it. */
export function writeStoredValue(key: string, value: string | null) {
  memory.set(key, value);
  try {
    if (value === null) kv?.removeItem(key);
    else kv?.setItem(key, value);
  } catch {
    // Storage full or blocked (e.g. private browsing): keep going without saving.
  }
  listeners.forEach((l) => l());
}

/** Reads a saved value right now (outside React). */
export function readStoredValue(key: string): string | null {
  return read(key);
}

/**
 * A string saved on this device. Returns undefined while it can't be known yet (web server
 * render and hydration), then the saved value or null.
 */
export function useStoredValue(key: string): [string | null | undefined, (value: string | null) => void] {
  const value = useSyncExternalStore<string | null | undefined>(
    subscribe,
    () => read(key),
    () => undefined,
  );
  const set = useCallback((v: string | null) => writeStoredValue(key, v), [key]);
  return [value, set];
}
