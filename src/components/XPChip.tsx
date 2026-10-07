import { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, radius, type } from '../theme';

interface Props {
  amount: number;
  /** How far up to fly (towards the header XP counter). */
  rise?: number;
  onDone: () => void;
}

/** "+12 XP" pops in, floats up toward the header counter, and fades. Mounted once per correct answer. */
export function XPChip({ amount, rise = 140, onDone }: Props) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  // Keep the latest onDone without restarting the animation when the parent re-renders.
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    const finish = () => doneRef.current();
    scale.value = withSpring(1, { damping: 10, stiffness: 220 });
    opacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(
        420,
        withTiming(0, { duration: 260 }, (finished) => {
          if (finished) scheduleOnRN(finish);
        }),
      ),
    );
    y.value = withDelay(180, withTiming(-rise, { duration: 620, easing: Easing.in(Easing.cubic) }));
  }, [y, opacity, scale, rise]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.chip, style]}>
      <Text style={styles.text}>+{amount} XP</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    pointerEvents: 'none',
    alignSelf: 'center',
    top: '40%',
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  text: { ...type.label, color: '#1F1300' },
});
