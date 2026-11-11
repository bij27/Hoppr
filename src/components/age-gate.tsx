import { Link, usePathname } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Frog } from '@/components/frog';
import { ThemedText } from '@/components/themed-text';
import { MIN_AGE } from '@/constants/app';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useStoredValue } from '@/hooks/use-stored-value';
import { useTheme } from '@/hooks/use-theme';

const STORAGE_KEY = 'hoppr.age-confirmed.v1';

/**
 * Asks once whether the person is 21+, and remembers a yes on this device. A "no" isn't saved, so
 * someone who tapped it by mistake can answer again next time they open the app. The privacy
 * page stays reachable before answering.
 */
export function AgeGate() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [confirmed, setConfirmed] = useStoredValue(STORAGE_KEY);
  const [declined, setDeclined] = useState(false);

  // undefined = not known yet (web, before hydration): show nothing rather than flash the gate.
  if (confirmed === undefined || confirmed !== null || pathname === '/privacy') return null;

  return (
    <Animated.View
      exiting={FadeOut.duration(220)}
      style={[
        StyleSheet.absoluteFill,
        styles.screen,
        { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.four },
      ]}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <Frog size={112} color={theme.live} />
          <ThemedText type="wordmark">Hoppr</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Happy hours near you, and a route that catches every one.
          </ThemedText>
        </View>

        {declined ? (
          <View style={styles.actions}>
            <ThemedText type="heading" style={styles.center}>
              Come back when you’re {MIN_AGE}.
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Hoppr is about drinks specials, so it’s only for people {MIN_AGE} and older.
            </ThemedText>
            <Button label="Go back" variant="quiet" onPress={() => setDeclined(false)} />
          </View>
        ) : (
          <View style={styles.actions}>
            <ThemedText type="heading" style={styles.center}>
              Are you {MIN_AGE} or older?
            </ThemedText>
            <Button label={`Yes, I’m ${MIN_AGE} or older`} onPress={() => setConfirmed(new Date().toISOString())} />
            <Button label="No" variant="secondary" onPress={() => setDeclined(true)} />
            <ThemedText type="caption" themeColor="textTertiary" style={styles.center}>
              By continuing you agree to our{' '}
              <Link href="/privacy" style={[styles.link, { color: theme.textSecondary }]}>
                Privacy Policy
              </Link>
              . Please drink responsibly.
            </ThemedText>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { zIndex: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  inner: { width: '100%', maxWidth: 420, gap: Spacing.six, alignSelf: 'center' },
  brand: { alignItems: 'center', gap: Spacing.two },
  actions: { gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth },
  center: { textAlign: 'center' },
  link: { textDecorationLine: 'underline' },
});
