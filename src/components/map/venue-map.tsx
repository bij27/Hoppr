// iOS (Apple Maps) and Android (Google Maps) map. The web build uses venue-map.web.tsx.
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';

import { MARKET_CENTER, toneColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

import type { MapPin, VenueMapProps } from './types';

const INITIAL_REGION = {
  latitude: MARKET_CENTER.lat,
  longitude: MARKET_CENTER.lng,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

/** Hide businesses and transit icons on Google Maps so only Hoppr's pins stand out. */
const QUIET_MAP_STYLE = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export function VenueMap({ pins, selectedId, onSelect, showUserLocation, bottomInset }: VenueMapProps) {
  const scheme = useColorScheme();
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const pin = pins.find((p) => p.id === selectedId);
    if (!pin) return;
    // mapPadding (below) keeps the centered pin in the area above the sheet.
    mapRef.current?.animateToRegion(
      { latitude: pin.location.lat, longitude: pin.location.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      350,
    );
  }, [selectedId, pins]);

  const onMapPress = (e: MapPressEvent) => {
    // Android also reports marker taps as map presses.
    if (e.nativeEvent.action === 'marker-press') return;
    onSelect(null);
  };

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={INITIAL_REGION}
      onPress={onMapPress}
      showsUserLocation={showUserLocation}
      showsPointsOfInterests={false}
      showsCompass={false}
      toolbarEnabled={false}
      customMapStyle={QUIET_MAP_STYLE}
      userInterfaceStyle={scheme === 'dark' ? 'dark' : 'light'}
      mapPadding={{ top: 0, left: 0, right: 0, bottom: bottomInset }}>
      {pins.map((pin) => (
        <Marker
          // Re-key on tone/selection so the custom view re-renders with tracksViewChanges off.
          key={`${pin.id}:${pin.tone}:${pin.id === selectedId}`}
          identifier={pin.id}
          coordinate={{ latitude: pin.location.lat, longitude: pin.location.lng }}
          onPress={() => onSelect(pin.id)}
          tracksViewChanges={false}
          accessibilityLabel={pin.label}
          anchor={{ x: 0.5, y: 0.5 }}>
          <Pin pin={pin} selected={pin.id === selectedId} />
        </Marker>
      ))}
    </MapView>
  );
}

function Pin({ pin, selected }: { pin: MapPin; selected: boolean }) {
  const theme = useTheme();
  const fill = toneColors(theme, pin.tone).fill;
  const size = selected ? 26 : 18;
  return (
    <View style={styles.hit}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fill,
          borderWidth: 3,
          borderColor: theme.surface,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
