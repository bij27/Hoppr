import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type DealStatus, statusLabel } from '@/lib/deals';

/** A dot and a few words: amber when live, ink when starting soon, gray otherwise. */
export function StatusBadge({ status, now }: { status: DealStatus; now: Date }) {
  const theme = useTheme();
  const tone =
    status.kind === 'active'
      ? { dot: theme.live, text: theme.liveText }
      : status.kind === 'upcoming'
        ? { dot: theme.text, text: theme.text }
        : { dot: theme.pinIdle, text: theme.textSecondary };

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: tone.dot }]} />
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
