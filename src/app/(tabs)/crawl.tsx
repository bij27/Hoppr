import { Link, useRouter } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, WebTopInset } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { MAX_CRAWL_STOPS, planCrawl } from '@/lib/crawl';
import { formatClock, formatDuration } from '@/lib/format';
import { useCrawl } from '@/state/crawl';
import { useVenues } from '@/state/venues';

const MS_PER_HOUR = 3_600_000;
const START_OPTIONS = 8;
const DWELL_OPTIONS = [30, 45, 60, 90];

export default function CrawlScreen() {
  const theme = useTheme();
  const router = useRouter();
  const now = useNow();
  const { byId } = useVenues();
  const crawl = useCrawl();
  // null = start now. Otherwise an absolute start time (top of an upcoming hour).
  const [startAtMs, setStartAtMs] = useState<number | null>(null);
  const [dwellMin, setDwellMin] = useState(45);

  // Fort Lauderdale's UTC offset is a whole number of hours, so UTC hour boundaries are local ones.
  const hourOptions = useMemo(() => {
    const firstHour = (Math.floor(now.getTime() / MS_PER_HOUR) + 1) * MS_PER_HOUR;
    return Array.from({ length: START_OPTIONS }, (_, i) => firstHour + i * MS_PER_HOUR);
  }, [now]);

  // A chosen start time that has already passed falls back to "now".
  const effectiveStartMs = startAtMs !== null && startAtMs > now.getTime() ? startAtMs : null;
  const startMs = effectiveStartMs ?? now.getTime();

  const venues = useMemo(
    () => crawl.stopIds.map((id) => byId.get(id)).filter((v) => v !== undefined),
    [crawl.stopIds, byId],
  );

  const plan = useMemo(
    () =>
      planCrawl(
        venues.map((v) => ({ id: v.id, location: v.location, schedules: v.deals })),
        { start: new Date(startMs), dwellMin },
      ),
    [venues, dwellMin, startMs],
  );

  if (venues.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView edges={['top']} style={[styles.safeArea, styles.emptyState]}>
          <ThemedText type="subtitle">Plan a crawl</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Add up to {MAX_CRAWL_STOPS} bars from the Deals tab. Hoppr orders them so you hit each happy hour
            while it’s live.
          </ThemedText>
          <Pressable
            onPress={() => router.navigate('/')}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.accent }, pressed && styles.pressed]}
            accessibilityRole="link">
            <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
              Browse deals
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const missed = plan.stops.length - plan.stopsWithDeal;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">Your crawl</ThemedText>
            <Pressable onPress={crawl.clear} hitSlop={8} accessibilityRole="button">
              <ThemedText type="smallBold" themeColor="textSecondary">
                Clear
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
            START
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <Chip label="Now" selected={effectiveStartMs === null} onPress={() => setStartAtMs(null)} />
            {hourOptions.map((ms) => (
              <Chip
                key={ms}
                label={formatClock(new Date(ms))}
                selected={effectiveStartMs === ms}
                onPress={() => setStartAtMs(ms)}
              />
            ))}
          </ScrollView>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
            TIME AT EACH BAR
          </ThemedText>
          <View style={styles.chips}>
            {DWELL_OPTIONS.map((m) => (
              <Chip key={m} label={formatDuration(m)} selected={dwellMin === m} onPress={() => setDwellMin(m)} />
            ))}
          </View>

          <ThemedView type="backgroundElement" style={styles.summary}>
            <ThemedText style={styles.bold}>
              {formatClock(plan.start)} – {formatClock(plan.end)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {plan.stopsWithDeal} of {plan.stops.length} stops during happy hour ·{' '}
              {formatDuration(plan.totalWalkMin)} walking
            </ThemedText>
            {missed > 0 && (
              <ThemedText type="small" style={{ color: theme.warning }}>
                {missed === 1 ? '1 stop misses' : `${missed} stops miss`} its happy hour. Try a different start time or
                swap the bar.
              </ThemedText>
            )}
          </ThemedView>

          <View>
            {plan.stops.map((stop, index) => {
              const venue = byId.get(stop.id);
              if (!venue) return null;
              return (
                <Fragment key={stop.id}>
                  {index > 0 && (
                    <View style={styles.walkRow}>
                      <View style={[styles.rail, { backgroundColor: theme.border }]} />
                      <ThemedText type="small" themeColor="textSecondary">
                        {stop.walkMin === 0 ? 'Next door' : `${formatDuration(stop.walkMin)} walk`}
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.stopRow}>
                    <View
                      style={[
                        styles.stopNumber,
                        { backgroundColor: stop.catchesDeal ? theme.accent : theme.backgroundSelected },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={{ color: stop.catchesDeal ? theme.onAccent : theme.textSecondary }}>
                        {index + 1}
                      </ThemedText>
                    </View>
                    <View style={styles.stopBody}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatClock(stop.arrive)} – {formatClock(stop.leave)}
                      </ThemedText>
                      <Link href={{ pathname: '/venue/[id]', params: { id: venue.id } }}>
                        <ThemedText style={styles.bold}>{venue.name}</ThemedText>
                      </Link>
                      <ThemedText type="small" style={{ color: stop.catchesDeal ? theme.live : theme.warning }}>
                        {stop.catchesDeal
                          ? `Happy hour for ${formatDuration(stop.dealMin)} of your visit`
                          : stop.dealMin > 0
                            ? `Only ${formatDuration(stop.dealMin)} of happy hour left`
                            : 'No happy hour during your visit'}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => crawl.remove(venue.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${venue.name}`}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        Remove
                      </ThemedText>
                    </Pressable>
                  </View>
                </Fragment>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centerText: { textAlign: 'center' },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: WebTopInset + Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { letterSpacing: 1, marginBottom: -Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chipsRow: { flexDirection: 'row', gap: Spacing.two },
  summary: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  bold: { fontWeight: 700 },
  pressed: { opacity: 0.75 },
  primaryButton: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, borderRadius: Spacing.three },
  walkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 36 },
  rail: { width: 2, alignSelf: 'stretch', marginLeft: 15 },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  stopNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stopBody: { flex: 1, gap: 2 },
});
