import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PillProps = { label: string; selected: boolean; onPress: () => void };

/** One option in a horizontally scrolling row of choices (days, start times). */
export function Pill({ label, selected, onPress }: PillProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: selected ? theme.primary : theme.surfaceMuted },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="captionStrong" style={{ color: selected ? theme.onPrimary : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: Radius.pill },
  pressed: { opacity: 0.75 },
});
