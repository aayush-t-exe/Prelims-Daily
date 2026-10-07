import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { levelProgress } from '../logic/xp';
import { colors, radius, space, type } from '../theme';

/** Level + XP with a bar to the next level. The bar animates `scaleX` (transform, not width) for 60fps. */
export function LevelBar({ xp }: { xp: number }) {
  const { level, into, needed, pct } = levelProgress(xp);
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withSpring(pct, { damping: 20, stiffness: 120 });
  }, [pct, fill]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  return (
    <View accessible accessibilityLabel={`Level ${level}, ${xp} XP, ${needed - into} XP to the next level`}>
      <View style={styles.row}>
        <Text style={styles.level}>Level {level}</Text>
        <Text style={styles.xp}>
          {xp} XP · {needed - into} to L{level + 1}
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, style]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm },
  level: { ...type.label, color: colors.primary },
  xp: { ...type.caption, color: colors.muted },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
  fill: {
    height: '100%',
    width: '100%',
    backgroundColor: colors.primary,
    transformOrigin: 'left',
  },
});
