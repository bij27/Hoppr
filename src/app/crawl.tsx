import { Link, Stack, useRouter } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Pill } from '@/components/pill';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
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
const DWELL_OPTIONS = [
  { key: '30', label: '30 min' },
  { key: '45', label: '45 min' },
  { key: '60', label: '1 hr' },
  { key: '90', label: '1.5 hr' },
] as const;
type DwellKey = (typeof DWELL_OPTIONS)[number]['key'];
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
  const [dwell, setDwell] = useState<DwellKey>('45');
  const dwellMin = Number(dwell);

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
      <ThemedView style={[styles.container, styles.emptyState]}>
        <ThemedText type="title" style={styles.centerText}>
          Plan a crawl
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          Add up to {MAX_CRAWL_STOPS} bars, or just the deals you want. Hoppr puts them in the order that catches each
          deal while it’s live.
        </ThemedText>
        <Button label="Find bars" onPress={() => router.navigate('/')} />
      </ThemedView>
    );
  }

  const missed = plan.stops.length - plan.stopsWithDeal;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => <Button label="Clear" variant="quiet" size="small" onPress={crawl.clear} />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <View style={styles.titleBlock}>
            <ThemedText type="title">Your crawl</ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              {dayOffset > 0 ? `${DAY_LONG[day.weekday]}, ` : ''}
              {formatClock(plan.start)} – {formatClock(plan.end)}
            </ThemedText>
          </View>

          <View style={styles.group}>
            <ThemedText type="overline" themeColor="textSecondary">
              WHEN
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
              {days.map((_, i) => (
                <Pill key={i} label={dayLabel(i)} selected={dayOffset === i} onPress={() => pickDay(i)} />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
              {dayOffset === 0 && (
                <Pill label="Now" selected={effectiveStartMs === null} onPress={() => setStartAtMs(null)} />
              )}
              {hourOptions.map((ms) => (
                <Pill
                  key={ms}
                  label={formatClock(new Date(ms))}
                  selected={effectiveStartMs === ms}
                  onPress={() => setStartAtMs(ms)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.group}>
            <ThemedText type="overline" themeColor="textSecondary">
              TIME AT EACH BAR
            </ThemedText>
            <Segmented options={DWELL_OPTIONS} value={dwell} onChange={setDwell} />
          </View>

          <View style={[styles.summary, { backgroundColor: missed > 0 ? theme.surfaceMuted : theme.liveSoft }]}>
            <ThemedText type="bodyStrong">
              {missed === 0
                ? `Every stop catches its deal`
                : `${plan.stopsWithDeal} of ${plan.stops.length} stops catch their deal`}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {formatDuration(plan.totalWalkMin)} walking in total
            </ThemedText>
            {missed > 0 && (
              <ThemedText type="caption" style={{ color: theme.warning }}>
                Try another day or start time, or swap a bar.
              </ThemedText>
            )}
          </View>

          <View>
            {plan.stops.map((stop, index) => {
              const entry = entryById.get(stop.id);
              if (!entry) return null;
              const { venue } = entry;
              const last = index === plan.stops.length - 1;
              return (
                <Fragment key={stop.id}>
                  <View style={styles.stopRow}>
                    <View style={styles.rail}>
                      <View
                        style={[
                          styles.stopDot,
                          stop.catchesDeal
                            ? { backgroundColor: theme.live, borderColor: theme.live }
                            : { backgroundColor: theme.background, borderColor: theme.warning },
                        ]}
                      />
                      {!last && <View style={[styles.railLine, { backgroundColor: theme.border }]} />}
                    </View>
                    <View style={styles.stopBody}>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {formatClock(stop.arrive)} – {formatClock(stop.leave)}
                      </ThemedText>
                      <Link href={{ pathname: '/venue/[id]', params: { id: venue.id } }}>
                        <ThemedText type="bodyStrong">{venue.name}</ThemedText>
                      </Link>
                      {!entry.whole && (
                        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
                          For {entry.deals.map((d) => d.title).join(' · ')}
                        </ThemedText>
                      )}
                      <ThemedText
                        type="captionStrong"
                        style={{ color: stop.catchesDeal ? theme.liveText : theme.warning }}>
                        {stop.catchesDeal
                          ? `Deal on for ${formatDuration(stop.dealMin)} of your visit`
                          : stop.dealMin > 0
                            ? `Only ${formatDuration(stop.dealMin)} of the deal left`
                            : 'No deal during your visit'}
                      </ThemedText>
                      {!last && (
                        <ThemedText type="caption" themeColor="textTertiary" style={styles.walk}>
                          {plan.stops[index + 1].walkMin === 0
                            ? 'Next door'
                            : `${formatDuration(plan.stops[index + 1].walkMin)} walk`}
                        </ThemedText>
                      )}
                    </View>
                    <Button label="Remove" variant="quiet" size="small" onPress={() => crawl.remove(venue.id)} />
                  </View>
                </Fragment>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingHorizontal: Spacing.five },
  centerText: { textAlign: 'center' },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.six, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.four },
  titleBlock: { gap: Spacing.one },
  group: { gap: Spacing.two },
  pills: { flexDirection: 'row', gap: Spacing.two },
  summary: { padding: Spacing.three, borderRadius: Radius.medium, gap: Spacing.one },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  rail: { width: 16, alignItems: 'center', alignSelf: 'stretch', paddingTop: 3 },
  stopDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5 },
  railLine: { width: 2, flex: 1, marginTop: Spacing.one },
  stopBody: { flex: 1, gap: 2, paddingBottom: Spacing.four },
  walk: { marginTop: Spacing.two },
});
