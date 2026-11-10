import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { MenuSection } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

/**
 * A deal's price list, laid out like a printed menu: item on the left, price on the right,
 * grouped into sections. Collapsed by default so the venue page stays scannable.
 */
export function DealMenu({ menu }: { menu: MenuSection[] }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const count = menu.reduce((n, s) => n + s.items.length, 0);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
        <ThemedText type="captionStrong" style={styles.underline}>
          {open ? 'Hide menu' : `View menu · ${count} items`}
        </ThemedText>
        <ThemedText type="captionStrong">{open ? '▴' : '▾'}</ThemedText>
      </Pressable>

      {open && (
        <View style={[styles.menu, { borderColor: theme.border }]}>
          {menu.map((section) => (
            <View key={section.section} style={styles.section}>
              <ThemedText type="overline" themeColor="textSecondary">
                {section.section.toUpperCase()}
              </ThemedText>
              {section.items.map((item) => (
                <View key={item.name} style={styles.item}>
                  <ThemedText type="caption" style={styles.name}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="captionStrong" style={styles.price}>
                    {item.price}
                  </ThemedText>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, alignSelf: 'flex-start', paddingVertical: 2 },
  underline: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.6 },
  menu: { marginTop: Spacing.two, paddingLeft: Spacing.three, borderLeftWidth: 2, gap: Spacing.three },
  section: { gap: Spacing.one },
  item: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.three },
  name: { flex: 1 },
  price: { fontVariant: ['tabular-nums'] },
});
