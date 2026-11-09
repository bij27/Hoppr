import { type ReactNode, useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BottomSheetProps = {
  /**
   * Visible heights, smallest first. Values <= 1 are fractions of the container height,
   * larger values are points. E.g. [180, 0.5, 0.9].
   */
  snapPoints: readonly number[];
  /** Current snap index (controlled). */
  index: number;
  onIndexChange: (index: number) => void;
  /** Always visible; drag it (or tap it) to resize the sheet. */
  header: ReactNode;
  /** Scrollable body. */
  children: ReactNode;
};

const SPRING = { damping: 28, stiffness: 260, mass: 0.9 } as const;
/** How far ahead (seconds) the fling velocity projects the release point. */
const FLING_PROJECTION_S = 0.12;

/**
 * A persistent, draggable sheet over the map, like Uber's.
 *
 * Only the header is draggable, so the list inside scrolls normally without fighting the
 * sheet's gesture. The sheet is as tall as its largest snap point and slides down to show less.
 * Must be rendered inside a container that fills the screen.
 */
export function BottomSheet({ snapPoints, index, onIndexChange, header, children }: BottomSheetProps) {
  const theme = useTheme();
  const [containerHeight, setContainerHeight] = useState(0);

  const heights = snapPoints.map((p) => (p <= 1 ? p * containerHeight : p));
  const maxHeight = Math.max(0, ...heights);
  // translateY for each snap index (0 = fully open).
  const offsets = heights.map((h) => maxHeight - h);

  const translateY = useSharedValue(0);
  const dragStart = useSharedValue(0);

  const targetOffset = offsets[Math.min(index, offsets.length - 1)] ?? 0;
  useEffect(() => {
    if (containerHeight > 0) translateY.set(withSpring(targetOffset, SPRING));
  }, [targetOffset, containerHeight, translateY]);

  const pan = usePanGesture({
    minDistance: 4,
    onBegin: () => {
      'worklet';
      dragStart.set(translateY.get());
    },
    onUpdate: (e) => {
      'worklet';
      const min = offsets[offsets.length - 1] ?? 0;
      const max = offsets[0] ?? 0;
      translateY.set(Math.min(max, Math.max(min, dragStart.get() + e.translationY)));
    },
    onDeactivate: (e) => {
      'worklet';
      const projected = translateY.get() + e.velocityY * FLING_PROJECTION_S;
      let best = 0;
      for (let i = 1; i < offsets.length; i++) {
        if (Math.abs(offsets[i] - projected) < Math.abs(offsets[best] - projected)) best = i;
      }
      translateY.set(withSpring(offsets[best], SPRING));
      scheduleOnRN(onIndexChange, best);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));

  const onLayout = (e: LayoutChangeEvent) => setContainerHeight(e.nativeEvent.layout.height);
  const cycle = () => onIndexChange((index + 1) % snapPoints.length);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={onLayout}>
      {containerHeight > 0 && (
        <Animated.View
          style={[
            styles.sheet,
            Elevation,
            { height: maxHeight, backgroundColor: theme.surface },
            animatedStyle,
          ]}>
          <GestureDetector gesture={pan}>
            <View>
              <Pressable
                onPress={cycle}
                accessibilityRole="adjustable"
                accessibilityLabel="Resize list"
                style={styles.handleArea}>
                <View style={[styles.handle, { backgroundColor: theme.border }]} />
              </Pressable>
              {header}
            </View>
          </GestureDetector>
          <View style={styles.body}>{children}</View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    overflow: 'hidden',
  },
  handleArea: { alignItems: 'center', paddingTop: Spacing.two, paddingBottom: Spacing.two },
  handle: { width: 40, height: 5, borderRadius: 3 },
  body: { flex: 1 },
});
