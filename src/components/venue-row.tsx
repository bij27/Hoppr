import { Pressable, StyleSheet, View } from 'react-native';

import { EventBadge } from '@/components/event-badge';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Venue } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import type { VenueView } from '@/lib/feed';
import { formatClock } from '@/lib/format';
import { eventLabel } from '@/lib/tags';

type VenueRowProps = {
  venue: Venue;
  /** How this bar appears right now (status, event badges, featured listing). */
  view: VenueView;
  now: Date;
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
  view,
  now,
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
          <EventBadge events={view.liveEvents} />
          <View style={styles.flex} />
          {distance && (
            <ThemedText type="caption" themeColor="textSecondary">
              {distance}
            </ThemedText>
          )}
        </View>
        {view.headline && (
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {view.headline.title}
          </ThemedText>
        )}
        {view.showStatus && <StatusBadge status={view.status} now={now} />}
        {view.nextEvent && (
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {eventLabel(view.nextEvent.deal)} at {formatClock(new Date(now.getTime() + view.nextEvent.startsInMin * 60_000))}
          </ThemedText>
        )}
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
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { flexShrink: 1 },
  flex: { flex: 1 },
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
