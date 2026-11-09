import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { LatLng } from '@/lib/geo';

type UserLocation = {
  /** Last known position, or null until we have one (or if permission was denied). */
  location: LatLng | null;
  /** True once the user has allowed location access. */
  granted: boolean;
};

/**
 * Asks for "while using the app" location once, then reads the position. Used for the map's
 * blue dot and walking distances. Everything still works without it.
 */
export function useUserLocation(): UserLocation {
  const [state, setState] = useState<UserLocation>({ location: null, granted: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (cancelled || !granted) return;
        setState((s) => ({ ...s, granted: true }));
        const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
        const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (!cancelled) {
          setState({ granted: true, location: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
        }
      } catch {
        // Location unavailable (services off, browser blocked, etc.); the app works without it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
