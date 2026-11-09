import type { ReactNode } from 'react';
import { Pressable, type PressableProps, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /** primary: solid ink. secondary: outlined. quiet: text only. */
  variant?: 'primary' | 'secondary' | 'quiet';
  size?: 'regular' | 'small';
  /** Optional trailing element, e.g. a stop count. */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = 'primary', size = 'regular', trailing, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const colors =
    variant === 'primary'
      ? { bg: theme.primary, fg: theme.onPrimary, border: theme.primary }
      : variant === 'secondary'
        ? { bg: 'transparent', fg: theme.text, border: theme.border }
        : { bg: 'transparent', fg: theme.text, border: 'transparent' };

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [
        styles.base,
        size === 'small' ? styles.small : styles.regular,
        { backgroundColor: colors.bg, borderColor: colors.border },
        pressed && styles.pressed,
        style,
      ]}>
      <ThemedText type={size === 'small' ? 'captionStrong' : 'bodyStrong'} style={{ color: colors.fg }}>
        {label}
      </ThemedText>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
  },
  regular: { minHeight: 52, paddingHorizontal: Spacing.four },
  small: { minHeight: 36, paddingHorizontal: Spacing.three, borderRadius: Radius.pill },
  pressed: { opacity: 0.8 },
});
