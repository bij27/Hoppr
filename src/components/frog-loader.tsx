import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Frog } from '@/components/frog';
import { useTheme } from '@/hooks/use-theme';

/** One hop, in ms. */
const HOP_MS = 560;
/** Crouch at the start of the launch sequence while the green frog turns red. */
const CROUCH = 0.45;
/** Hops per cycle: red, orange, green, matching the deal status colors. */
const HOPS = 3;

/**
 * Progress `t` runs over hops: 0–1 red, 1–2 orange, 2–3 green. The launch sequence starts at
 * -CROUCH (green, crouching, turning red). Each layer's opacity at a given t.
 */
function layerOpacity(layer: 0 | 1 | 2, t: number, looping: boolean): number {
  'worklet';
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  // Color changes happen mid-air, around the top of each hop.
  const toOrange = clamp((t - 0.35) / 0.3);
  const toGreen = clamp((t - 1.35) / 0.3);
  // Looping: green fades back to red during the last part of the green hop's landing.
  const backToRed = looping ? clamp((t - 2.8) / 0.2) : 0;
  // Launch: starts green and turns red during the crouch.
  const fromGreen = t < 0 ? clamp(-t / CROUCH) : 0;
  if (layer === 0) return t < 0 ? 1 - fromGreen : Math.max(1 - toOrange, backToRed);
  if (layer === 1) return t < 0 ? 0 : toOrange * (1 - toGreen);
  return t < 0 ? fromGreen : toGreen * (1 - backToRed);
}

type FrogLoaderProps = {
  size?: number;
  /** "loop" for loading states; "launch" plays crouch + three hops once and calls onFinish. */
  mode?: 'loop' | 'launch';
  onFinish?: () => void;
};

/**
 * The frog hops, turning red → orange → green (the same colors as deal statuses: nothing soon,
 * starting soon, live). Green is the mascot's resting color.
 */
export function FrogLoader({ size = 72, mode = 'loop', onFinish }: FrogLoaderProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(mode === 'launch' ? -CROUCH : 0);
  const looping = mode === 'loop';
  const lift = size * 0.45;

  useEffect(() => {
    if (looping) {
      t.set(0);
      t.set(withRepeat(withTiming(HOPS, { duration: HOP_MS * HOPS, easing: Easing.linear }), -1, false));
    } else {
      t.set(-CROUCH);
      t.set(
        withTiming(HOPS, { duration: HOP_MS * (HOPS + CROUCH), easing: Easing.linear }, (finished) => {
          if (finished && onFinish) scheduleOnRN(onFinish);
        }),
      );
    }
    return () => cancelAnimation(t);
  }, [looping, onFinish, t]);

  const hopStyle = useAnimatedStyle(() => {
    const v = t.get();
    if (reduceMotion) return { transform: [] };
    if (v < 0) {
      // Crouch: squash down, ready to jump.
      const c = Math.sin((-v / CROUCH) * Math.PI);
      return { transform: [{ translateY: c * size * 0.04 }, { scaleY: 1 - c * 0.12 }, { scaleX: 1 + c * 0.06 }] };
    }
    const p = v % 1;
    const height = 4 * p * (1 - p); // parabola, 0 → 1 → 0
    const squash = p < 0.12 ? (0.12 - p) / 0.12 : p > 0.9 ? (p - 0.9) / 0.1 : 0;
    return {
      transform: [
        { translateY: -lift * height },
        { rotate: `${-14 + 26 * p}deg` },
        { scaleY: 1 - squash * 0.12 },
        { scaleX: 1 + squash * 0.06 },
      ],
    };
  });
  const red = useAnimatedStyle(() => ({ opacity: layerOpacity(0, t.get(), looping) }));
  const orange = useAnimatedStyle(() => ({ opacity: layerOpacity(1, t.get(), looping) }));
  const green = useAnimatedStyle(() => ({ opacity: layerOpacity(2, t.get(), looping) }));

  return (
    <View
      style={{ width: size, height: size + lift, justifyContent: 'flex-end' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading">
      <Animated.View style={[{ width: size, height: size }, hopStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, red]}>
          <Frog size={size} color={theme.idle} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, orange]}>
          <Frog size={size} color={theme.soon} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, green]}>
          <Frog size={size} color={theme.live} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
