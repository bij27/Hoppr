import { Pressable, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Venue } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import type { DealStatus } from '@/lib/deals';

type VenueRowProps = {
  venue: Venue;
  status: DealStatus;
  now: Date;
  /** The one deal to feature (usually the live or next one). */
  headline: string | null;
  distance: string | null;
  selected: boolean;
  /** Deals picked for the crawl at this venue; undefined if not in the crawl. */
  pickedDealIds: readonly string[] | undefined;
  onPress: () => void;
  onToggleCrawl: () => void;
};

/**
 * One bar in the list: name, the deal that matters right now, and when. Everything else lives
 * on the venue page, so the list stays scannable. The crawl button is a sibling of the
 * pressable body so tapping it never also opens the venue.
 */
export function VenueRow({
  venue,
  status,
  now,
  headline,
  distance,
  selected,
  pickedDealIds,
  onPress,
  onToggleCrawl,
}: VenueRowProps) {
  const theme = useTheme();
  const inCrawl = pickedDealIds !== undefined;
  const picked = inCrawl ? venue.deals.filter((d) => pickedDealIds.includes(d.id)).length : 0;
  const partial = inCrawl && picked < venue.deals.length;

  return (
    <View style={[styles.row, selected && { backgroundColor: theme.surfaceMuted }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        <View style={styles.titleLine}>
          <ThemedText type="bodyStrong" numberOfLines={1} style={styles.name}>
            {venue.name}
          </ThemedText>
          {distance && (
            <ThemedText type="caption" themeColor="textSecondary">
              {distance}
            </ThemedText>
          )}
        </View>
        {headline && (
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {headline}
          </ThemedText>
        )}
        <StatusBadge status={status} now={now} />
      </Pressable>

      <Pressable
        onPress={onToggleCrawl}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={inCrawl ? `Remove ${venue.name} from crawl` : `Add ${venue.name} to crawl`}
        style={({ pressed }) => [
          styles.add,
          inCrawl
            ? { backgroundColor: theme.primary, borderColor: theme.primary }
            : { borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="captionStrong" style={{ color: inCrawl ? theme.onPrimary : theme.text }}>
          {!inCrawl ? 'Add' : partial ? `✓ ${picked}` : '✓'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  body: { flex: 1, gap: Spacing.one },
  titleLine: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  name: { flexShrink: 1 },
  add: {
    minWidth: 52,
    height: 34,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
