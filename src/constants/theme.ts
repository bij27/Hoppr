/**
 * Hoppr design tokens: "ink & amber".
 *
 * Ink and warm white do almost all the work, like printed type on paper. Amber is reserved for
 * one meaning, "a deal is live", so it always carries information. Primary actions are solid
 * ink buttons. Keep new colors out of screens; add a token here instead.
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
    /** "Live now": fills (dots, pins). */
    live: '#D99A2B',
    /** "Live now": text on light backgrounds (darker for contrast). */
    liveText: '#8F5E0A',
    liveSoft: '#FBF1DD',
    /** A planned stop that misses its deal. */
    warning: '#A23B2A',
    /** Pins for bars with nothing on soon. */
    pinIdle: '#B9B3AA',
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
    live: '#E3A73E',
    liveText: '#EDB95C',
    liveSoft: '#2B2213',
    warning: '#E5836B',
    pinIdle: '#5C5852',
    scrim: 'rgba(0,0,0,0.4)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
