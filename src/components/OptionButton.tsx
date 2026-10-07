import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, space, type } from '../theme';

export type OptionState = 'idle' | 'correct' | 'wrong' | 'reveal' | 'dim';

interface Props {
  index: number;
  text: string;
  state: OptionState;
  onPress: () => void;
  disabled: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D'];
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OptionButton({ index, text, state, onPress, disabled }: Props) {
  const x = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (state === 'wrong') {
      // A short, damped horizontal shake.
      x.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 60 }),
        withTiming(-7, { duration: 60 }),
        withTiming(7, { duration: 60 }),
        withTiming(0, { duration: 50 }),
      );
    } else if (state === 'correct') {
      scale.value = withSequence(withTiming(1.03, { duration: 120 }), withSpring(1, { damping: 12 }));
    }
  }, [state, x, scale]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scale: scale.value }],
  }));

  const palette = {
    idle: { bg: colors.card, border: colors.border, fg: colors.text, badge: colors.primarySoft, badgeFg: colors.primary },
    correct: { bg: colors.successSoft, border: colors.success, fg: colors.text, badge: colors.success, badgeFg: '#fff' },
    reveal: { bg: colors.successSoft, border: colors.success, fg: colors.text, badge: colors.success, badgeFg: '#fff' },
    wrong: { bg: colors.errorSoft, border: colors.error, fg: colors.text, badge: colors.error, badgeFg: '#fff' },
    dim: { bg: colors.card, border: colors.border, fg: colors.muted, badge: colors.track, badgeFg: colors.muted },
  }[state];

  const icon = state === 'correct' || state === 'reveal' ? 'checkmark' : state === 'wrong' ? 'close' : null;
  const status =
    state === 'correct' ? ', your answer, correct' : state === 'wrong' ? ', your answer, wrong' : state === 'reveal' ? ', correct answer' : '';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Option ${LETTERS[index]}: ${text}${status}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.option, { backgroundColor: palette.bg, borderColor: palette.border }, animated]}
    >
      <View style={[styles.badge, { backgroundColor: palette.badge }]}>
        {icon ? (
          <Ionicons name={icon} size={16} color={palette.badgeFg} />
        ) : (
          <Text style={[styles.letter, { color: palette.badgeFg }]}>{LETTERS[index]}</Text>
        )}
      </View>
      <Text style={[styles.text, { color: palette.fg }]}>{text}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  letter: { ...type.label },
  text: { ...type.body, flex: 1 },
});
