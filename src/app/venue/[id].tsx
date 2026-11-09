import { Stack, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { dealStatus } from '@/lib/deals';
import { formatDays, formatVerified, formatWindow } from '@/lib/format';
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
  const [notice, setNotice] = useState<string | null>(null);
  const venue = typeof id === 'string' ? byId.get(id) : undefined;

  if (!venue) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="textSecondary">{loading ? 'Loading…' : 'This bar isn’t available.'}</ThemedText>
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
            <StatusBadge status={dealStatus(venue.deals, now)} now={now} />
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

          {venue.deals.length === 0 && <ThemedText themeColor="textSecondary">No deals listed yet.</ThemedText>}
          <View>
            {venue.deals.map((d, i) => {
              const picked = pickedDealIds?.includes(d.id) ?? false;
              return (
                <Fragment key={d.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                  <View style={styles.deal}>
                    <View style={styles.dealBody}>
                      <ThemedText type="bodyStrong">{d.title}</ThemedText>
                      <ThemedText type="caption">
                        {formatDays(d.days)} · {formatWindow(d.startMin, d.endMin)}
                        <ThemedText type="caption" themeColor="textTertiary">
                          {'  ·  '}
                          {CATEGORY_LABEL[d.category]}
                        </ThemedText>
                      </ThemedText>
                      {d.details && (
                        <ThemedText type="caption" themeColor="textSecondary">
                          {d.details}
                        </ThemedText>
                      )}
                      <StatusBadge status={dealStatus([d], now)} now={now} />
                      <ThemedText type="caption" themeColor="textTertiary">
                        {formatVerified(d.lastVerifiedAt, now)}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => onToggleDeal(d.id)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={picked ? `Remove ${d.title} from crawl` : `Add ${d.title} to crawl`}
                      style={({ pressed }) => [
                        styles.dealToggle,
                        picked
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { borderColor: theme.border },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="captionStrong" style={{ color: picked ? theme.onPrimary : theme.text }}>
                        {picked ? '✓ Added' : 'Add'}
                      </ThemedText>
                    </Pressable>
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
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.six, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.four },
  titleBlock: { gap: Spacing.two },
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
});
