import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Shown after the label in a lighter color, e.g. "optional". */
  hint?: string;
};

/** A labeled text input in the app's style. */
export function TextField({ label, hint, multiline, ...rest }: TextFieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <ThemedText type="captionStrong">
        {label}
        {hint && (
          <ThemedText type="caption" themeColor="textTertiary">
            {'  '}
            {hint}
          </ThemedText>
        )}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textTertiary}
        multiline={multiline}
        {...rest}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one + Spacing.half },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
});
