import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Type scale. Few sizes, used consistently:
 *   wordmark: the serif "Hoppr" logotype
 *   title:    screen titles and venue names on their own page
 *   heading:  section titles and sheet headers
 *   body / bodyStrong: list rows and paragraphs
 *   caption / captionStrong: metadata, times, labels
 *   overline: small all-caps section labels
 */
export type TextVariant =
  | 'wordmark'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'captionStrong'
  | 'overline';

export type ThemedTextProps = TextProps & {
  type?: TextVariant;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'body', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  wordmark: { fontFamily: Fonts.serif, fontSize: 24, lineHeight: 28, fontWeight: 600, fontStyle: 'italic' },
  title: { fontFamily: Fonts.sans, fontSize: 30, lineHeight: 36, fontWeight: 700, letterSpacing: -0.5 },
  heading: { fontFamily: Fonts.sans, fontSize: 20, lineHeight: 26, fontWeight: 700, letterSpacing: -0.2 },
  body: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, fontWeight: 400 },
  bodyStrong: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, fontWeight: 600 },
  caption: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 19, fontWeight: 400 },
  captionStrong: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 19, fontWeight: 600 },
  overline: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 16, fontWeight: 600, letterSpacing: 1 },
});
