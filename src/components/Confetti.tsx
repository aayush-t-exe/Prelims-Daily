import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { mulberry32 } from '../logic/dailySet';
import { colors } from '../theme';

const PALETTE = [colors.accent, colors.primary, colors.success, '#F472B6', colors.freeze];
const COUNT = 30;

interface PieceSpec {
  x: number;
  drift: number;
  delay: number;
  spin: number;
  color: string;
  w: number;
  h: number;
  duration: number;
}

function Piece({ spec, height }: { spec: PieceSpec; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(spec.delay, withTiming(1, { duration: spec.duration, easing: Easing.out(Easing.quad) }));
  }, [t, spec]);

  // One shared value (0→1) drives fall, sideways drift, spin and fade together.
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - Math.max(0, t.value - 0.75) * 4,
    transform: [
      { translateX: spec.drift * t.value },
      { translateY: -40 + (height + 80) * t.value },
      { rotate: `${spec.spin * t.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[styles.piece, { left: spec.x, width: spec.w, height: spec.h, backgroundColor: spec.color }, style]}
    />
  );
}

/** ~30 animated views, no library. Each is transform + opacity only, so it stays on the UI thread. */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  // Seeded RNG instead of Math.random, so render stays pure (React Compiler requirement).
  const pieces = useMemo<PieceSpec[]>(() => {
    const rand = mulberry32(42);
    return Array.from({ length: COUNT }, (_, i) => ({
      x: rand() * width,
      drift: (rand() - 0.5) * 160,
      delay: rand() * 350,
      spin: (rand() < 0.5 ? -1 : 1) * (360 + rand() * 540),
      color: PALETTE[i % PALETTE.length],
      w: 7 + rand() * 6,
      h: 10 + rand() * 8,
      duration: 1800 + rand() * 1000,
    }));
  }, [width]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Piece key={i} spec={p} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, borderRadius: 2 },
});
