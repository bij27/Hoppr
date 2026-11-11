// Web: the browser's localStorage. null while server-rendering (no browser storage there).
export const kv: Storage | null = typeof window === 'undefined' ? null : window.localStorage;
