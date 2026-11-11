/**
 * Hoppr design tokens.
 *
 * Ink and warm white do almost all the work, like printed type on paper. The only other colors
 * are the deal-status signals, used consistently for pins, status text and timeline dots:
 *   green = live now, amber = starts within a few hours, red = nothing on soon.
 * Primary actions are solid ink buttons. Keep new colors out of screens; add a token here.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** Page canvas behind everything. */
    background: '#FAF8F5',
    /** Raised surfaces: the bottom sheet, floating controls. */
    surface: '#FFFFFF',
    /** Quiet fills: unselected segments, pressed rows. */
    surfaceMuted: '#F1EEE9',
    border: '#E6E1D9',
    text: '#111111',
    textSecondary: '#6B6863',
    textTertiary: '#9C978F',
    /** Solid ink buttons. */
    primary: '#111111',
    onPrimary: '#FFFFFF',
    /** Deal status fills (pins, dots) and matching text (darker, for contrast on light). */
    live: '#2E9E5B',
    liveText: '#1D7A42',
    liveSoft: '#E4F4EA',
    soon: '#E89B2E',
    soonText: '#9A5A00',
    idle: '#D2483B',
    idleText: '#B13A2E',
    /** A planned stop that misses its deal. */
    warning: '#B13A2E',
    scrim: 'rgba(17,17,17,0.08)',
  },
  dark: {
    background: '#0E0E0E',
    surface: '#181818',
    surfaceMuted: '#232323',
    border: '#2C2A27',
    text: '#F2EFEA',
    textSecondary: '#A6A199',
    textTertiary: '#77726B',
    primary: '#F2EFEA',
    onPrimary: '#111111',
    live: '#4CC27A',
    liveText: '#6AD293',
    liveSoft: '#13291C',
    soon: '#F0AE48',
    soonText: '#F4C06C',
    idle: '#E5675A',
    idleText: '#EE8478',
    warning: '#EE8478',
    scrim: 'rgba(0,0,0,0.4)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** live/soon/idle = deal status. event = only an event is on (ink, so green always means a deal). */
export type DealTone = 'live' | 'soon' | 'idle' | 'event';

/** Fill (pins, dots) and text color for a deal status. */
export function toneColors(
  c: (typeof Colors)['light'] | (typeof Colors)['dark'],
  tone: DealTone,
): { fill: string; text: string } {
  switch (tone) {
    case 'live':
      return { fill: c.live, text: c.liveText };
    case 'soon':
      return { fill: c.soon, text: c.soonText };
    case 'idle':
      return { fill: c.idle, text: c.idleText };
    case 'event':
      return { fill: c.text, text: c.text };
  }
}

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', mono: 'ui-monospace' },
  web: { sans: 'var(--font-display)', serif: 'var(--font-serif)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', serif: 'serif', mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 10,
  medium: 16,
  large: 24,
  pill: 999,
} as const;

/** Soft, low shadow for floating controls (map overlays, the sheet). */
export const Elevation = Platform.select({
  web: { boxShadow: '0 4px 20px rgba(0,0,0,0.10)' },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});

export const MaxContentWidth = 640;

/** Fort Lauderdale, roughly Las Olas to the beach: the map's starting view. */
export const MARKET_CENTER = { lat: 26.1224, lng: -80.1373 };
