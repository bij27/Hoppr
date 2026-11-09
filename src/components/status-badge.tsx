import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, toneColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type DealStatus, statusLabel } from '@/lib/deals';
import { pinTone } from '@/lib/feed';

/** A dot and a few words: green when live, amber when starting soon, red otherwise. */
export function StatusBadge({ status, now }: { status: DealStatus; now: Date }) {
  const theme = useTheme();
  // Same tone as the bar's map pin.
  const tone = toneColors(theme, pinTone(status));

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: tone.fill }]} />
      <ThemedText type="captionStrong" style={{ color: tone.text }}>
        {statusLabel(status, now)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
