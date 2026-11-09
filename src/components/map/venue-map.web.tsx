// Web map: Leaflet with CARTO's minimal basemap (native maps libraries don't support web).
// Leaflet touches `window` when imported, so it's loaded lazily in the browser only; the
// server-rendered page just contains the empty map container.
import 'leaflet/dist/leaflet.css';

import type * as Leaflet from 'leaflet';
import { useEffect, useRef, useState } from 'react';

import { Colors, MARKET_CENTER } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { MapPin, VenueMapProps } from './types';

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function VenueMap({ pins, selectedId, onSelect, showUserLocation, bottomInset }: VenueMapProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const tilesRef = useRef<Leaflet.TileLayer | null>(null);
  const markersRef = useRef<Leaflet.LayerGroup | null>(null);
  const userDotRef = useRef<Leaflet.CircleMarker | null>(null);
  // Leaflet handlers are registered once; read the latest onSelect through a ref.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  // Bumped once the map exists, so the effects below run against it.
  const [tick, setTick] = useState(0);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((mod) => {
      const L = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true }).setView(
        [MARKET_CENTER.lat, MARKET_CENTER.lng],
        13,
      );
      map.on('click', () => onSelectRef.current(null));
      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setTick((n) => n + 1);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Basemap follows light/dark mode.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    tilesRef.current?.remove();
    tilesRef.current = L.tileLayer(TILES[scheme], {
      attribution: ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);
  }, [scheme, tick]);

  // Pins.
  useEffect(() => {
    const L = leafletRef.current;
    const group = markersRef.current;
    if (!L || !group) return;
    group.clearLayers();
    for (const pin of pins) {
      const selected = pin.id === selectedId;
      L.marker([pin.location.lat, pin.location.lng], {
        icon: pinIcon(L, pin, selected, scheme),
        title: pin.label,
        keyboard: true,
        zIndexOffset: selected ? 1000 : pin.tone === 'live' ? 500 : 0,
      })
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectRef.current(pin.id);
        })
        .addTo(group);
    }
  }, [pins, selectedId, scheme, tick]);

  // Center the selected pin within the area above the sheet.
  useEffect(() => {
    const map = mapRef.current;
    const pin = pins.find((p) => p.id === selectedId);
    if (!map || !pin) return;
    const zoom = Math.max(map.getZoom(), 15);
    const target = map.project([pin.location.lat, pin.location.lng], zoom).add([0, bottomInset / 2]);
    map.flyTo(map.unproject(target, zoom), zoom, { duration: 0.4 });
    // Only re-center when the selection changes, not when pins re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, tick]);

  // The user's location (browser geolocation), as a small ink dot.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !showUserLocation || !('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        if (userDotRef.current) userDotRef.current.setLatLng(ll);
        else
          userDotRef.current = L.circleMarker(ll, {
            radius: 7,
            color: '#FFFFFF',
            weight: 3,
            fillColor: '#2F6FEB',
            fillOpacity: 1,
            interactive: false,
          }).addTo(map);
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60_000 },
    );
    return () => {
      navigator.geolocation.clearWatch(id);
      userDotRef.current?.remove();
      userDotRef.current = null;
    };
  }, [showUserLocation, tick]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, backgroundColor: Colors[scheme].background }}
      aria-label="Map of bars"
    />
  );
}

function pinIcon(L: typeof Leaflet, pin: MapPin, selected: boolean, scheme: 'light' | 'dark'): Leaflet.DivIcon {
  const c = Colors[scheme];
  const fill = pin.tone === 'live' ? c.live : pin.tone === 'soon' ? c.text : c.pinIdle;
  const size = selected ? 26 : 18;
  return L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer">
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${fill};border:3px solid ${c.surface};box-shadow:0 1px 4px rgba(0,0,0,.25);box-sizing:border-box"></div>
    </div>`,
  });
}
