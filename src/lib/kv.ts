// Small key-value storage on the device. Native: expo-sqlite's localStorage (persists across
// launches). The web version is kv.web.ts.
import 'expo-sqlite/localStorage/install';

export const kv: Storage | null = typeof localStorage === 'undefined' ? null : localStorage;
