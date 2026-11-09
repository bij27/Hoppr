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
import { addDays, localDate, zonedTimeToMs } from '@/lib/time';
import { useCrawl } from '@/state/crawl';
import { isWholeVenue, selectedDeals } from '@/state/crawl-stops';
import { useVenues } from '@/state/venues';

const MS_PER_HOUR = 3_600_000;
const START_OPTIONS = 8;
const DWELL_OPTIONS = [30, 45, 60, 90];
const DAYS_AHEAD = 7;
/** Start hours offered for days after today: 11 AM – 11 PM. */
const FUTURE_HOURS = Array.from({ length: 13 }, (_, i) => 11 + i);
const DEFAULT_FUTURE_START_MIN = 16 * 60;
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function CrawlScreen() {
  const theme = useTheme();
  const router = useRouter();
  const now = useNow();
  const { byId } = useVenues();
  const crawl = useCrawl();
  // 0 = today. Picking a later day always sets an explicit start time.
  const [dayOffset, setDayOffset] = useState(0);
  // null = start now. Otherwise an absolute start time (top of an hour).
  const [startAtMs, setStartAtMs] = useState<number | null>(null);
  const [dwellMin, setDwellMin] = useState(45);

  const today = localDate(now);
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));
  const day = days[dayOffset];
  const dayLabel = (i: number) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_SHORT[days[i].weekday]);

  // Today: the next few hours (Fort Lauderdale's UTC offset is whole hours, so UTC hour
  // boundaries are local ones). Later days: a fixed range of local start hours.
  const hourOptions =
    dayOffset === 0
      ? Array.from({ length: START_OPTIONS }, (_, i) => (Math.floor(now.getTime() / MS_PER_HOUR) + 1 + i) * MS_PER_HOUR)
      : FUTURE_HOURS.map((h) => zonedTimeToMs(day, h * 60));

  const pickDay = (offset: number) => {
    setDayOffset(offset);
    setStartAtMs(offset === 0 ? null : zonedTimeToMs(days[offset], DEFAULT_FUTURE_START_MIN));
  };

  // A chosen start time that has already passed falls back to "now".
  const effectiveStartMs = startAtMs !== null && startAtMs > now.getTime() ? startAtMs : null;
  const startMs = effectiveStartMs ?? now.getTime();

  // Each stop with the deals it's for. The planner only times visits against those deals.
  const entries = useMemo(
    () =>
      crawl.stops.flatMap((stop) => {
        const venue = byId.get(stop.venueId);
        if (!venue) return [];
        return [{ venue, deals: selectedDeals(stop, venue.deals), whole: isWholeVenue(stop, venue.deals) }];
      }),
    [crawl.stops, byId],
  );
  const entryById = useMemo(() => new Map(entries.map((e) => [e.venue.id, e])), [entries]);

  const plan = useMemo(
    () =>
      planCrawl(
        entries.map((e) => ({ id: e.venue.id, location: e.venue.location, schedules: e.deals })),
        { start: new Date(startMs), dwellMin },
      ),
    [entries, dwellMin, startMs],
  );

  if (entries.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView edges={['top']} style={[styles.safeArea, styles.emptyState]}>
          <ThemedText type="subtitle">Plan a crawl</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Add up to {MAX_CRAWL_STOPS} bars, or just the deals you want, from the Deals tab. Hoppr orders them so
            you hit each deal while it’s live.
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
            {days.map((d, i) => (
              <Chip key={i} label={dayLabel(i)} selected={dayOffset === i} onPress={() => pickDay(i)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {dayOffset === 0 && (
              <Chip label="Now" selected={effectiveStartMs === null} onPress={() => setStartAtMs(null)} />
            )}
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
              {dayOffset > 0 && `${DAY_LONG[day.weekday]} · `}
              {formatClock(plan.start)} – {formatClock(plan.end)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {plan.stopsWithDeal} of {plan.stops.length} stops during a deal ·{' '}
              {formatDuration(plan.totalWalkMin)} walking
            </ThemedText>
            {missed > 0 && (
              <ThemedText type="small" style={{ color: theme.warning }}>
                {missed === 1 ? '1 stop misses its deal' : `${missed} stops miss their deals`}. Try a different day
                or start time, or swap the bar.
              </ThemedText>
            )}
          </ThemedView>

          <View>
            {plan.stops.map((stop, index) => {
              const entry = entryById.get(stop.id);
              if (!entry) return null;
              const { venue } = entry;
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
                      {!entry.whole && (
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                          For: {entry.deals.map((d) => d.title).join(' · ')}
                        </ThemedText>
                      )}
                      <ThemedText type="small" style={{ color: stop.catchesDeal ? theme.live : theme.warning }}>
                        {stop.catchesDeal
                          ? `Deal on for ${formatDuration(stop.dealMin)} of your visit`
                          : stop.dealMin > 0
                            ? `Only ${formatDuration(stop.dealMin)} of the deal left`
                            : 'No deal during your visit'}
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
