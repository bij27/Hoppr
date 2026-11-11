import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { FrogLoader } from '@/components/frog-loader';
import { VenueMap } from '@/components/map/venue-map';
import type { MapPin } from '@/components/map/types';
import { Segmented } from '@/components/segmented';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VenueRow } from '@/components/venue-row';
import { Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { Venue } from '@/data/types';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import { dealStatus } from '@/lib/deals';
import { featuredDeal, type FeedFilter, matchesFilter, pinTone, rankStatus } from '@/lib/feed';
import { formatClock } from '@/lib/format';
import { distanceMeters, formatDistance } from '@/lib/geo';
import { useCrawl } from '@/state/crawl';
import { useVenues } from '@/state/venues';

const FILTERS = [
  { key: 'now', label: 'Live now' },
  { key: 'soon', label: 'Next 4 hrs' },
  { key: 'all', label: 'All' },
] as const;

const SHEET_TITLES: Record<FeedFilter, string> = {
  now: 'Live now',
  soon: 'Live & starting soon',
  all: 'All bars',
};

const PEEK_HEIGHT = 228;
const CRAWL_BAR_SPACE = 92;

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const now = useNow();
  const { venues, loading, error, reload } = useVenues();
  const crawl = useCrawl();
  const { location, granted } = useUserLocation();

  const [filter, setFilter] = useState<FeedFilter>('now');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetIndex, setSheetIndex] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const snapPoints = [PEEK_HEIGHT + insets.bottom, Math.round(windowHeight * 0.5), windowHeight - insets.top - 64];

  const rows = useMemo(
    () =>
      venues
        .map((venue) => ({ venue, status: dealStatus(venue.deals, now) }))
        .filter((r) => matchesFilter(r.status, filter))
        .sort((a, b) => rankStatus(a.status) - rankStatus(b.status) || a.venue.name.localeCompare(b.venue.name)),
    [venues, now, filter],
  );

  const pins = useMemo<MapPin[]>(
    () => rows.map(({ venue, status }) => ({ id: venue.id, location: venue.location, tone: pinTone(status), label: venue.name })),
    [rows],
  );

  const selected = rows.find((r) => r.venue.id === selectedId) ?? null;
  const distanceTo = (v: Venue) => (location ? formatDistance(distanceMeters(location, v.location)) : null);
  const headlineFor = (v: Venue) => featuredDeal(v.deals, now)?.title ?? null;

  const toggleCrawl = (venue: Venue) => {
    setNotice(crawl.toggleVenue(venue) ? null : 'Your crawl is full. Remove a stop to add another.');
  };
  const openVenue = (id: string) => router.push({ pathname: '/venue/[id]', params: { id } });
  const selectPin = (id: string | null) => {
    setSelectedId(id);
    if (id) setSheetIndex(0);
  };

  const header = selected ? (
    <View style={styles.sheetHeader}>
      <View style={styles.selectedTop}>
        <View style={styles.flex}>
          <ThemedText type="heading" numberOfLines={1}>
            {selected.venue.name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {[selected.venue.neighborhood, distanceTo(selected.venue)].filter(Boolean).join(' · ')}
          </ThemedText>
        </View>
        <Button label="Close" variant="quiet" size="small" onPress={() => setSelectedId(null)} />
      </View>
      {headlineFor(selected.venue) && (
        <ThemedText type="body" numberOfLines={1}>
          {headlineFor(selected.venue)}
        </ThemedText>
      )}
      <StatusBadge status={selected.status} now={now} />
      <View style={styles.selectedActions}>
        <Button label="View deals" style={styles.flex} onPress={() => openVenue(selected.venue.id)} />
        <Button
          label={crawl.has(selected.venue.id) ? 'In crawl ✓' : 'Add to crawl'}
          variant="secondary"
          style={styles.flex}
          onPress={() => toggleCrawl(selected.venue)}
        />
      </View>
    </View>
  ) : (
    <View style={styles.sheetHeader}>
      <View style={styles.titleRow}>
        <ThemedText type="heading">{SHEET_TITLES[filter]}</ThemedText>
        {!loading && (
          <ThemedText type="caption" themeColor="textSecondary">
            {rows.length} {rows.length === 1 ? 'bar' : 'bars'}
          </ThemedText>
        )}
      </View>
      <Segmented options={FILTERS} value={filter} onChange={setFilter} />
      {notice && (
        <ThemedText type="caption" style={{ color: theme.warning }}>
          {notice}
        </ThemedText>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <VenueMap
        pins={pins}
        selectedId={selectedId}
        onSelect={selectPin}
        showUserLocation={granted}
        bottomInset={snapPoints[Math.min(sheetIndex, 1)]}
      />

      <View style={[styles.topBar, { top: insets.top + Spacing.two }]} pointerEvents="box-none">
        <View style={[styles.brandPill, Elevation, { backgroundColor: theme.surface }]}>
          <ThemedText type="wordmark">Hoppr</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {formatClock(now)}
          </ThemedText>
        </View>
      </View>

      <BottomSheet snapPoints={snapPoints} index={sheetIndex} onIndexChange={setSheetIndex} header={header}>
        <FlatList
          data={rows}
          keyExtractor={(r) => r.venue.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (crawl.stops.length > 0 ? CRAWL_BAR_SPACE : Spacing.four) },
          ]}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          renderItem={({ item }) => (
            <VenueRow
              venue={item.venue}
              status={item.status}
              now={now}
              headline={headlineFor(item.venue)}
              distance={distanceTo(item.venue)}
              selected={item.venue.id === selectedId}
              pickedDealIds={crawl.dealIdsFor(item.venue.id)}
              onPress={() => openVenue(item.venue.id)}
              onToggleCrawl={() => toggleCrawl(item.venue)}
            />
          )}
          ListFooterComponent={
            loading ? undefined : (
              <Pressable
                onPress={() => router.push('/suggest')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.suggest, pressed && styles.pressed]}>
                <ThemedText type="caption" themeColor="textSecondary" style={styles.center}>
                  Know a happy hour we’re missing?{' '}
                  <ThemedText type="captionStrong" style={styles.underline}>
                    Suggest it
                  </ThemedText>
                </ThemedText>
              </Pressable>
            )
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.empty}>
                <FrogLoader size={56} />
              </View>
            ) : error ? (
              <View style={styles.empty}>
                <ThemedText themeColor="textSecondary" style={styles.center}>
                  Couldn’t load deals. {error}
                </ThemedText>
                <Button label="Try again" variant="secondary" size="small" onPress={reload} />
              </View>
            ) : (
              <View style={styles.empty}>
                <ThemedText themeColor="textSecondary" style={styles.center}>
                  {filter === 'now'
                    ? 'Nothing’s live right now.'
                    : filter === 'soon'
                      ? 'Nothing starts in the next 4 hours.'
                      : 'No bars yet.'}
                </ThemedText>
                {filter !== 'all' && (
                  <Button
                    label={filter === 'now' ? 'See what’s next' : 'See all bars'}
                    variant="secondary"
                    size="small"
                    onPress={() => setFilter(filter === 'now' ? 'soon' : 'all')}
                  />
                )}
              </View>
            )
          }
        />
      </BottomSheet>

      {crawl.stops.length > 0 && (
        <View style={[styles.crawlBar, { bottom: insets.bottom + Spacing.three }]} pointerEvents="box-none">
          <Button
            label="Plan crawl"
            style={[styles.crawlButton, Elevation]}
            onPress={() => router.push('/crawl')}
            trailing={
              <View style={[styles.count, { backgroundColor: theme.onPrimary }]}>
                <ThemedText type="captionStrong" style={{ color: theme.primary }}>
                  {crawl.stops.length}
                </ThemedText>
              </View>
            }
          />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  topBar: { position: 'absolute', left: Spacing.three, right: Spacing.three, flexDirection: 'row' },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  sheetHeader: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  selectedTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  selectedActions: { flexDirection: 'row', gap: Spacing.two },
  list: { paddingHorizontal: Spacing.two, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.three },
  empty: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.five, paddingHorizontal: Spacing.four },
  suggest: { paddingVertical: Spacing.four, paddingHorizontal: Spacing.four, alignItems: 'center' },
  underline: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.6 },
  crawlBar: { position: 'absolute', left: Spacing.three, right: Spacing.three, alignItems: 'center' },
  crawlButton: { width: '100%', maxWidth: MaxContentWidth },
  count: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
