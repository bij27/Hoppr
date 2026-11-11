import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { FrogLoader } from '@/components/frog-loader';
import { useTheme } from '@/hooks/use-theme';

/** Matches imageWidth of the native splash in app.json, so the hand-off is seamless. */
const SPLASH_FROG = 160;

/**
 * Shown over the app on launch, right after the native splash (a static green frog) hides:
 * the frog crouches, then hops red → orange → green, and the screen fades away once the first
 * data has loaded. If loading takes longer, the frog keeps hopping.
 */
export function LaunchScreen({ ready }: { ready: boolean }) {
  const theme = useTheme();
  const [played, setPlayed] = useState(false);
  const [gone, setGone] = useState(false);
  const onFinish = useCallback(() => setPlayed(true), []);

  // Latch: once it's gone it stays gone, even if venues reload later.
  if (played && ready && !gone) setGone(true);
  if (gone || (played && ready)) return null;
  const lift = SPLASH_FROG * 0.45;
  return (
    <Animated.View
      exiting={FadeOut.duration(280)}
      style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: theme.background }]}
      pointerEvents="none">
      <View style={{ transform: [{ translateY: -lift / 2 }] }}>
        <FrogLoader size={SPLASH_FROG} mode={played ? 'loop' : 'launch'} onFinish={onFinish} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', zIndex: 10 },
});
