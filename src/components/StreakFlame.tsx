import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, type } from '../theme';

// Reanimated 4 CSS animation: declared once, runs natively on the UI thread.
const pulse = {
  from: { transform: [{ scale: 1 }] },
  to: { transform: [{ scale: 1.15 }] },
};

export function StreakFlame({ count, size = 44 }: { count: number; size?: number }) {
  const alive = count > 0;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={alive ? `${count} day streak` : 'No active streak'}
    >
      <Animated.View
        style={
          alive
            ? {
                animationName: pulse,
                animationDuration: '900ms',
                animationIterationCount: 'infinite',
                animationDirection: 'alternate',
                animationTimingFunction: 'ease-in-out',
              }
            : undefined
        }
      >
        <Ionicons name="flame" size={size} color={alive ? colors.accent : '#C7C7C2'} />
      </Animated.View>
      <View>
        <Text style={[styles.count, !alive && { color: colors.muted }]}>{count}</Text>
        <Text style={styles.caption}>day streak</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { ...type.display, fontSize: 32, lineHeight: 36, color: colors.text },
  caption: { ...type.caption, color: colors.muted, marginTop: -2 },
});
