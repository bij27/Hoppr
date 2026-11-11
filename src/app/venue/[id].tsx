import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useState } from 'react';

import type { Deal } from '@/data/types';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { DealFeedback } from '@/components/deal-feedback';
import { DealMenu } from '@/components/deal-menu';
import { EventBadge } from '@/components/event-badge';
import { FrogLoader } from '@/components/frog-loader';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { dealStatus } from '@/lib/deals';
import { isEvent } from '@/lib/feed';
import { formatDays, formatWindow } from '@/lib/format';
import { tagLabel } from '@/lib/tags';
import { useCrawl } from '@/state/crawl';
import { useVenues } from '@/state/venues';

const CATEGORY_LABEL = { drinks: 'Drinks', food: 'Food', both: 'Food & drinks' } as const;
const FULL_NOTICE = 'Your crawl is full. Remove a stop to add another.';

export default function VenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const now = useNow();
  const { byId, loading } = useVenues();
  const crawl = useCrawl();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const venue = typeof id === 'string' ? byId.get(id) : undefined;

  if (!venue) {
    return (
      <ThemedView style={styles.center}>
        {loading ? <FrogLoader size={56} /> : <ThemedText themeColor="textSecondary">This bar isn’t available.</ThemedText>}
      </ThemedView>
    );
  }

  const pickedDealIds = crawl.dealIdsFor(venue.id);
  const inCrawl = pickedDealIds !== undefined;
  const onToggleVenue = () => setNotice(crawl.toggleVenue(venue) ? null : FULL_NOTICE);
  const onToggleDeal = (dealId: string) => setNotice(crawl.toggleDeal(venue, dealId) ? null : FULL_NOTICE);
  const openDirections = () => {
    const { lat, lng } = venue.location;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`).catch(() =>
      setNotice('Couldn’t open maps on this device.'),
    );
  };

  const deals = venue.deals.filter((d) => !isEvent(d));
  const events = venue.deals.filter(isEvent);
  const liveEvents = events.filter((e) => dealStatus([e], now).kind === 'active');
  const features = (venue.tags ?? []).flatMap((t) => tagLabel(t) ?? []);

  const renderListing = (d: Deal, i: number) => {
    const picked = pickedDealIds?.includes(d.id) ?? false;
    const status = dealStatus([d], now);
    const labels = [
      ...(isEvent(d) ? [] : [CATEGORY_LABEL[d.category]]),
      ...(d.tags ?? []).flatMap((t) => tagLabel(t) ?? []),
    ];
    return (
      <Fragment key={d.id}>
        {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
        <View style={styles.deal}>
          <View style={styles.dealBody}>
            <ThemedText type="bodyStrong">{d.title}</ThemedText>
            <ThemedText type="caption">
              {formatDays(d.days)} · {formatWindow(d.startMin, d.endMin)}
              {labels.length > 0 && (
                <ThemedText type="caption" themeColor="textTertiary">
                  {'  ·  '}
                  {labels.join(' · ')}
                </ThemedText>
              )}
            </ThemedText>
            {d.details && (
              <ThemedText type="caption" themeColor="textSecondary">
                {d.details}
              </ThemedText>
            )}
            {d.menu && <DealMenu menu={d.menu} />}
            <StatusBadge status={status} now={now} />
            <DealFeedback deal={d} live={status.kind === 'active'} now={now} />
          </View>
          <Pressable
            onPress={() => onToggleDeal(d.id)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={picked ? `Remove ${d.title} from crawl` : `Add ${d.title} to crawl`}
            style={({ pressed }) => [
              styles.dealToggle,
              picked ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="captionStrong" style={{ color: picked ? theme.onPrimary : theme.text }}>
              {picked ? '✓ Added' : 'Add'}
            </ThemedText>
          </Pressable>
        </View>
      </Fragment>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <View style={styles.titleBlock}>
            <ThemedText type="title">{venue.name}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {venue.neighborhood} · {venue.address}
            </ThemedText>
            {features.length > 0 && (
              <ThemedText type="caption" themeColor="textSecondary">
                {features.join(' · ')}
              </ThemedText>
            )}
            <View style={styles.statusLine}>
              {deals.length > 0 && <StatusBadge status={dealStatus(deals, now)} now={now} />}
              <EventBadge events={liveEvents} />
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              label={inCrawl ? 'Remove from crawl' : 'Add to crawl'}
              variant={inCrawl ? 'secondary' : 'primary'}
              style={styles.flex}
              onPress={onToggleVenue}
            />
            <Button label="Directions" variant="secondary" onPress={openDirections} />
          </View>
          {notice && (
            <ThemedText type="caption" style={{ color: theme.warning }}>
              {notice}
            </ThemedText>
          )}

          <View style={styles.section}>
            <ThemedText type="overline" themeColor="textSecondary">
              DEALS
            </ThemedText>
            <ThemedText type="caption" themeColor="textTertiary">
              Only here for one? Add just that deal and your crawl is timed around it.
            </ThemedText>
          </View>
          {deals.length === 0 && <ThemedText themeColor="textSecondary">No deals listed yet.</ThemedText>}
          <View>{deals.map(renderListing)}</View>

          {events.length > 0 && (
            <>
              <View style={styles.section}>
                <ThemedText type="overline" themeColor="textSecondary">
                  EVENTS & NIGHTS
                </ThemedText>
              </View>
              <View>{events.map(renderListing)}</View>
            </>
          )}

          <Pressable
            onPress={() => router.push({ pathname: '/suggest', params: { venueId: venue.id } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.suggest, { borderColor: theme.border }, pressed && styles.pressed]}>
            <ThemedText type="caption" themeColor="textSecondary">
              Know another deal here?{' '}
              <ThemedText type="captionStrong" style={styles.underline}>
                Suggest it
              </ThemedText>
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.six, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.four },
  titleBlock: { gap: Spacing.two },
  statusLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  section: { gap: Spacing.one, marginTop: Spacing.two },
  divider: { height: StyleSheet.hairlineWidth },
  deal: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, paddingVertical: Spacing.three },
  dealBody: { flex: 1, gap: Spacing.one + Spacing.half },
  dealToggle: {
    minWidth: 76,
    height: 34,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  suggest: { paddingTop: Spacing.four, borderTopWidth: StyleSheet.hairlineWidth },
  underline: { textDecorationLine: 'underline' },
});
