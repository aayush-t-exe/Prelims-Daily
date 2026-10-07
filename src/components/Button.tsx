import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors, radius, space, type } from '../theme';

type Variant = 'primary' | 'accent' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function tapHaptic() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Big tappable button with a spring "press-in" scale (runs on the UI thread). */
export function Button({ label, onPress, variant = 'primary', icon, disabled, style, accessibilityHint }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const v = variants[variant];

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => (scale.set(withSpring(0.97, { damping: 20, stiffness: 400 })))}
      onPressOut={() => (scale.set(withSpring(1, { damping: 15, stiffness: 300 })))}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={[styles.base, { backgroundColor: v.bg, borderColor: v.border }, disabled && styles.disabled, animated, style]}
    >
      {icon}
      <Text style={[styles.label, { color: v.fg }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const variants: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
  accent: { bg: colors.accent, fg: '#1F1300', border: colors.accent },
  ghost: { bg: 'transparent', fg: colors.primary, border: colors.border },
  danger: { bg: colors.error, fg: '#fff', border: colors.error },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  label: { ...type.label, fontSize: 16 },
  disabled: { opacity: 0.45 },
});
