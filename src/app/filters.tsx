import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Pill } from '@/components/pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { DealTypeFilter } from '@/lib/feed';
import { TAGS } from '@/lib/tags';
import { useFilters } from '@/state/filters';

const DEAL_TYPES: { value: DealTypeFilter; label: string }[] = [
  { value: 'drinks', label: 'Drink deals' },
  { value: 'food', label: 'Food deals' },
];

/** Filter panel for the home screen. Changes apply immediately; Done just closes it. */
export default function FiltersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const filters = useFilters();

  const section = (title: string, hint: string, children: ReactNode) => (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <ThemedText type="overline" themeColor="textSecondary">
          {title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textTertiary">
          {hint}
        </ThemedText>
      </View>
      <View style={styles.pills}>{children}</View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <ThemedText type="title">Filters</ThemedText>
          {section(
            'EVENTS & NIGHTS',
            'Works with Live now: Karaoke + Live now = karaoke on right now.',
            TAGS.filter((t) => t.section === 'events').map((t) => (
              <Pill
                key={t.slug}
                label={t.label}
                selected={filters.tags.includes(t.slug)}
                onPress={() => filters.toggleTag(t.slug)}
              />
            )),
          )}
          {section(
            'DEALS',
            'Happy hours with food or drink specials, and brunch.',
            [
              ...DEAL_TYPES.map((t) => (
                <Pill
                  key={t.value}
                  label={t.label}
                  selected={filters.types.includes(t.value)}
                  onPress={() => filters.toggleType(t.value)}
                />
              )),
              ...TAGS.filter((t) => t.section === 'deals').map((t) => (
                <Pill
                  key={t.slug}
                  label={t.label}
                  selected={filters.tags.includes(t.slug)}
                  onPress={() => filters.toggleTag(t.slug)}
                />
              )),
            ],
          )}
          {section(
            'THE BAR HAS',
            'Pick several to see bars with any of them.',
            TAGS.filter((t) => t.section === 'features').map((t) => (
              <Pill
                key={t.slug}
                label={t.label}
                selected={filters.tags.includes(t.slug)}
                onPress={() => filters.toggleTag(t.slug)}
              />
            )),
          )}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={[styles.inner, styles.row]}>
          <Button label="Clear all" variant="secondary" style={styles.flex} onPress={filters.clear} />
          <Button label="Done" style={styles.flex} onPress={() => router.back()} />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: Spacing.four, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.five, alignSelf: 'center' },
  section: { gap: Spacing.three },
  sectionTitle: { gap: Spacing.one },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  footer: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.two },
});
