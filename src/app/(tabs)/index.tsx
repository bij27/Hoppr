import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VenueCard } from '@/components/venue-card';
import { BottomTabInset, MaxContentWidth, Spacing, WebTopInset } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { dealStatus, type DealStatus } from '@/lib/deals';
import { formatClock } from '@/lib/format';
import { useCrawl } from '@/state/crawl';
import { useVenues } from '@/state/venues';

type Filter = 'now' | 'soon' | 'all';

const SOON_WINDOW_MIN = 4 * 60;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'now', label: 'Live now' },
  { key: 'soon', label: 'Next 4 hrs' },
  { key: 'all', label: 'All' },
];

const EMPTY_MESSAGES: Record<Filter, string> = {
  now: 'No happy hours are live right now. Check what starts soon.',
  soon: 'Nothing starts in the next 4 hours.',
  all: 'No venues yet.',
};

function matches(status: DealStatus, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (status.kind === 'active') return true;
  return filter === 'soon' && status.kind === 'upcoming' && status.startsInMin <= SOON_WINDOW_MIN;
}

/** Live deals first (most time left first), then upcoming (soonest first), then the rest. */
function rank(status: DealStatus): number {
  if (status.kind === 'active') return -(status.endsInMin ?? Number.MAX_SAFE_INTEGER);
  if (status.kind === 'upcoming') return 1e9 + status.startsInMin;
  return 2e9;
}

export default function DealsScreen() {
  const theme = useTheme();
  const now = useNow();
  const { venues, loading, error, reload } = useVenues();
  const crawl = useCrawl();
  const [filter, setFilter] = useState<Filter>('now');
  const [notice, setNotice] = useState<string | null>(null);

  const rows = useMemo(() => {
    return venues
      .map((venue) => ({ venue, status: dealStatus(venue.deals, now) }))
      .filter((r) => matches(r.status, filter))
      .sort((a, b) => rank(a.status) - rank(b.status) || a.venue.name.localeCompare(b.venue.name));
  }, [venues, now, filter]);

  const toggle = (id: string) => {
    const ok = crawl.toggle(id);
    setNotice(ok ? null : 'Your crawl is full. Remove a stop to add another.');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <FlatList
          data={rows}
          keyExtractor={(r) => r.venue.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <View>
                <ThemedText type="subtitle" style={{ color: theme.accent }}>
                  Hoppr
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Fort Lauderdale · {formatClock(now)}
                </ThemedText>
              </View>
              <View style={styles.filters}>
                {FILTERS.map((f) => (
                  <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
                ))}
              </View>
              {notice && (
                <ThemedText type="small" style={{ color: theme.warning }}>
                  {notice}
                </ThemedText>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <VenueCard
              venue={item.venue}
              status={item.status}
              now={now}
              inCrawl={crawl.has(item.venue.id)}
              onToggleCrawl={() => toggle(item.venue.id)}
            />
          )}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={styles.empty} color={theme.accent} />
            ) : error ? (
              <View style={styles.empty}>
                <ThemedText themeColor="textSecondary">Couldn’t load deals: {error}</ThemedText>
                <Pressable onPress={reload} accessibilityRole="button">
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    Try again
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                {EMPTY_MESSAGES[filter]}
              </ThemedText>
            )
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: WebTopInset + Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  header: { gap: Spacing.three },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  empty: { paddingVertical: Spacing.five, gap: Spacing.two, alignItems: 'center', textAlign: 'center' },
});
