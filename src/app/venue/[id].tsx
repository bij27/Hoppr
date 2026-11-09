import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { dealStatus } from '@/lib/deals';
import { formatDays, formatVerified, formatWindow } from '@/lib/format';
import { useCrawl } from '@/state/crawl';
import { useVenues } from '@/state/venues';

const CATEGORY_LABEL = { drinks: 'Drinks', food: 'Food', both: 'Food & drinks' } as const;

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
        <Stack.Screen options={{ title: '' }} />
        <ThemedText themeColor="textSecondary">{loading ? 'Loading…' : 'This venue isn’t available.'}</ThemedText>
      </ThemedView>
    );
  }

  const pickedDealIds = crawl.dealIdsFor(venue.id);
  const inCrawl = pickedDealIds !== undefined;
  const fullNotice = 'Your crawl is full. Remove a stop to add another.';
  const onToggle = () => setNotice(crawl.toggleVenue(venue) ? null : fullNotice);
  const onToggleDeal = (dealId: string) => setNotice(crawl.toggleDeal(venue, dealId) ? null : fullNotice);
  const openDirections = () => {
    const { lat, lng } = venue.location;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`).catch(() =>
      setNotice('Couldn’t open maps on this device.'),
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: venue.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <View style={styles.titleBlock}>
            <ThemedText type="subtitle">{venue.name}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {venue.neighborhood} · {venue.address}
            </ThemedText>
            <StatusBadge status={dealStatus(venue.deals, now)} now={now} />
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onToggle}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: inCrawl ? theme.backgroundSelected : theme.accent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: inCrawl ? theme.text : theme.onAccent }}>
                {inCrawl ? 'Remove from crawl' : 'Add whole bar to crawl'}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={openDirections}
              accessibilityRole="link"
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">Directions</ThemedText>
            </Pressable>
          </View>
          {notice && (
            <ThemedText type="small" style={{ color: theme.warning }}>
              {notice}
            </ThemedText>
          )}

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
            HAPPY HOURS
          </ThemedText>
          {venue.deals.length === 0 && <ThemedText themeColor="textSecondary">No deals listed yet.</ThemedText>}
          {venue.deals.map((d) => (
            <ThemedView key={d.id} type="backgroundElement" style={styles.deal}>
              <View style={styles.dealHeader}>
                <ThemedText style={styles.dealTitle}>{d.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {CATEGORY_LABEL[d.category]}
                </ThemedText>
              </View>
              <ThemedText type="small">
                {formatDays(d.days)} · {formatWindow(d.startMin, d.endMin)}
              </ThemedText>
              {d.details && (
                <ThemedText type="small" themeColor="textSecondary">
                  {d.details}
                </ThemedText>
              )}
              <StatusBadge status={dealStatus([d], now)} now={now} />
              <View style={styles.dealFooter}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                  {formatVerified(d.lastVerifiedAt, now)}
                </ThemedText>
                <DealCrawlButton
                  picked={pickedDealIds?.includes(d.id) ?? false}
                  title={d.title}
                  onPress={() => onToggleDeal(d.id)}
                />
              </View>
            </ThemedView>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function DealCrawlButton({ picked, title, onPress }: { picked: boolean; title: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={picked ? `Remove ${title} from crawl` : `Add ${title} to crawl`}
      style={({ pressed }) => [
        styles.dealButton,
        picked ? { backgroundColor: theme.accent } : { borderColor: theme.accent, borderWidth: 1.5 },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={{ color: picked ? theme.onAccent : theme.accent }}>
        {picked ? '✓ In crawl' : '+ Crawl'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, paddingBottom: Spacing.six, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  titleBlock: { gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  primaryButton: { flex: 1, alignItems: 'center', paddingVertical: Spacing.three, borderRadius: Spacing.three },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
  },
  pressed: { opacity: 0.75 },
  sectionLabel: { marginTop: Spacing.two, letterSpacing: 1 },
  deal: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one + Spacing.half },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.two },
  dealTitle: { flex: 1, fontWeight: 700 },
  dealFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  dealButton: {
    paddingVertical: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.two + Spacing.one,
    borderRadius: 999,
  },
});
