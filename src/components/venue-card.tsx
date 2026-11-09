import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Venue } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import type { DealStatus } from '@/lib/deals';
import { formatDays, formatWindow } from '@/lib/format';

type VenueCardProps = {
  venue: Venue;
  status: DealStatus;
  now: Date;
  inCrawl: boolean;
  onToggleCrawl: () => void;
};

/**
 * The crawl button is a SIBLING of the tappable body, not a child, so tapping it never also
 * opens the venue. (Not using <Link asChild>: Expo Router's Slot rejects Pressable's style callback.)
 */
export function VenueCard({ venue, status, now, inCrawl, onToggleCrawl }: VenueCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const shown = venue.deals.slice(0, 2);
  const more = venue.deals.length - shown.length;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Pressable
        onPress={() => router.push({ pathname: '/venue/[id]', params: { id: venue.id } })}
        accessibilityRole="link"
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        <View>
          <ThemedText type="default" style={styles.name} numberOfLines={1}>
            {venue.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {venue.neighborhood}
          </ThemedText>
        </View>

        <StatusBadge status={status} now={now} />

        <View style={styles.deals}>
          {shown.map((d) => (
            <View key={d.id}>
              <ThemedText type="small" style={styles.dealTitle} numberOfLines={1}>
                {d.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {formatDays(d.days)} · {formatWindow(d.startMin, d.endMin)}
              </ThemedText>
            </View>
          ))}
          {more > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              +{more} more
            </ThemedText>
          )}
        </View>
      </Pressable>

      <Pressable
        onPress={onToggleCrawl}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={inCrawl ? `Remove ${venue.name} from crawl` : `Add ${venue.name} to crawl`}
        style={({ pressed }) => [
          styles.crawlButton,
          inCrawl ? { backgroundColor: theme.accent } : { borderColor: theme.accent, borderWidth: 1.5 },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold" style={{ color: inCrawl ? theme.onAccent : theme.accent }}>
          {inCrawl ? '✓ In crawl' : '+ Crawl'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  body: { flex: 1, gap: Spacing.two },
  pressed: { opacity: 0.75 },
  name: { fontWeight: 700 },
  crawlButton: {
    paddingVertical: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.two + Spacing.one,
    borderRadius: 999,
  },
  deals: { gap: Spacing.one },
  dealTitle: { fontWeight: 600 },
});
