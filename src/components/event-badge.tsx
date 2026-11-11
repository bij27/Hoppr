import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Deal } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { eventLabel } from '@/lib/tags';

/** "Live music now" (+1 if more are on). Shown next to a bar's name while an event is on. */
export function EventBadge({ events }: { events: readonly Deal[] }) {
  const theme = useTheme();
  if (events.length === 0) return null;
  const more = events.length - 1;
  return (
    <View
      style={[styles.badge, { backgroundColor: theme.text }]}
      accessibilityLabel={`${events.map(eventLabel).join(', ')} on now`}>
      <ThemedText type="captionStrong" numberOfLines={1} style={{ color: theme.background }}>
        {eventLabel(events[0])} now{more > 0 ? ` +${more}` : ''}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: Spacing.two, paddingVertical: 1, borderRadius: Radius.pill, flexShrink: 1 },
});
