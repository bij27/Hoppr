import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type DealStatus, statusLabel } from '@/lib/deals';

export function StatusBadge({ status, now }: { status: DealStatus; now: Date }) {
  const theme = useTheme();
  const colors =
    status.kind === 'active'
      ? { bg: theme.liveSoft, fg: theme.live }
      : status.kind === 'upcoming'
        ? { bg: theme.accentSoft, fg: theme.accent }
        : { bg: theme.backgroundElement, fg: theme.textSecondary };

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      {status.kind === 'active' && <View style={[styles.dot, { backgroundColor: colors.fg }]} />}
      <ThemedText type="smallBold" style={{ color: colors.fg }}>
        {statusLabel(status, now)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one + Spacing.half,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
