import type { LatLng } from '@/lib/geo';

/** live: a deal is on now. soon: one starts within a few hours. idle: nothing soon. */
export type PinTone = 'live' | 'soon' | 'idle';

export type MapPin = {
  id: string;
  location: LatLng;
  tone: PinTone;
  label: string;
};

export type VenueMapProps = {
  pins: readonly MapPin[];
  selectedId: string | null;
  /** Called with a pin id, or null when the empty map is tapped. */
  onSelect: (id: string | null) => void;
  /** Show the user's own location dot. */
  showUserLocation: boolean;
  /** Height covered by the bottom sheet, so the selected pin is centered in the visible area. */
  bottomInset: number;
};
