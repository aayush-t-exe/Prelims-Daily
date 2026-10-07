import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Confetti } from '@/components/Confetti';
import { ProgressRing } from '@/components/ProgressRing';
import { Screen } from '@/components/Screen';
import { useCountUp } from '@/components/useCountUp';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space, type } from '@/theme';

/** Old streak number flips up and out, new one springs in. */
function StreakFlip({ from, to }: { from: number; to: number }) {
  const changed = to !== from;
  const oldY = useSharedValue(0);
  const newY = useSharedValue(changed ? 30 : 0);
  const newScale = useSharedValue(1);

  useEffect(() => {
    if (!changed) return;
    oldY.value = withDelay(900, withTiming(-30, { duration: 250 }));
    newY.value = withDelay(900, withSpring(0, { damping: 12 }));
    newScale.value = withDelay(1150, withSequence(withSpring(1.35, { damping: 6 }), withSpring(1)));
  }, [changed, oldY, newY, newScale]);

  const oldStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.abs(oldY.value) / 30, transform: [{ translateY: oldY.value }] }));
  const newStyle = useAnimatedStyle(() => ({
    opacity: 1 - newY.value / 30,
    transform: [{ translateY: newY.value }, { scale: newScale.value }],
  }));

  return (
    <View style={styles.flipBox} accessible accessibilityLabel={`Streak ${to} days`}>
      {changed && <Animated.Text style={[styles.flipNum, styles.abs, oldStyle]}>{from}</Animated.Text>}
      <Animated.Text style={[styles.flipNum, newStyle]}>{to}</Animated.Text>
    </View>
  );
}

export default function Result() {
  const r = useAppStore((s) => s.lastResult);
  const accuracy = r && r.total ? r.correct / r.total : 0;
  const pct = useCountUp(Math.round(accuracy * 100), { duration: 1100, delay: 250 });
  const xp = useCountUp(r?.xpEarned ?? 0, { duration: 1100, delay: 600 });

  if (!r) return <Redirect href="/" />;

  const extended = r.streakCounted && r.streakAfter > r.streakBefore;
  const celebrate = extended || accuracy >= 0.7;
  const headline = accuracy >= 0.9 ? 'Outstanding!' : accuracy >= 0.7 ? 'Great work!' : accuracy >= 0.4 ? 'Good effort' : 'Every attempt counts';
  const mistakes = r.total - r.correct;

  return (
    <View style={{ flex: 1 }}>
      <Screen edges={['top', 'bottom']} contentStyle={styles.page}>
        <Animated.Text entering={FadeInDown.duration(400)} style={styles.headline}>
          {headline}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(80).duration(400)} style={styles.sub}>
          {r.round > 0 ? 'Practice round complete' : "Today's set complete"}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.ring}>
          <ProgressRing progress={accuracy} size={200} stroke={16} color={accuracy >= 0.7 ? colors.success : colors.accent}>
            <Text style={styles.score} accessibilityLabel={`${Math.round(accuracy * 100)} percent`}>
              {pct}%
            </Text>
            <Text style={styles.scoreSub}>
              {r.correct} of {r.total} correct
            </Text>
          </ProgressRing>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.tiles}>
          <Card style={styles.tile}>
            <Ionicons name="star" size={22} color={colors.accent} />
            <Text style={styles.tileNum}>+{xp}</Text>
            <Text style={styles.tileLabel}>XP earned</Text>
          </Card>
          <Card style={styles.tile}>
            <Ionicons name="flame" size={22} color={r.streakAfter > 0 ? colors.accent : colors.muted} />
            <StreakFlip from={r.streakBefore} to={r.streakAfter} />
            <Text style={styles.tileLabel}>day streak</Text>
          </Card>
        </Animated.View>

        {(r.usedFreeze || r.earnedFreeze) && (
          <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.freeze}>
            <Ionicons name="snow" size={18} color="#0369A1" />
            <Text style={styles.freezeText}>
              {r.usedFreeze ? 'A streak freeze covered the day you missed. ' : ''}
              {r.earnedFreeze ? 'You earned a streak freeze for 7 days in a row!' : ''}
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(550).duration(400)} style={styles.actions}>
          {mistakes > 0 && (
            <Button
              label={`Review ${mistakes} mistake${mistakes === 1 ? '' : 's'}`}
              variant="ghost"
              // dismissTo pops back to the existing tabs instead of stacking a new copy of them.
              // `t` makes each visit a new param, so Review switches to Mistakes every time.
              onPress={() => router.dismissTo({ pathname: '/review', params: { tab: 'mistakes', t: String(Date.now()) } })}
            />
          )}
          <Button label="Back to home" onPress={() => router.dismissTo('/')} />
        </Animated.View>
      </Screen>
      {celebrate && <Confetti />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'stretch', paddingTop: space.xl },
  headline: { ...type.title, fontSize: 28, color: colors.text, textAlign: 'center' },
  sub: { ...type.label, color: colors.muted, textAlign: 'center', marginTop: space.xs },
  ring: { alignItems: 'center', marginVertical: space.xl },
  score: { ...type.display, fontSize: 48, color: colors.text },
  scoreSub: { ...type.label, color: colors.muted },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: { flex: 1, alignItems: 'center', gap: space.xs },
  tileNum: { ...type.display, fontSize: 30, color: colors.text },
  tileLabel: { ...type.caption, color: colors.muted },
  flipBox: { height: 38, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', minWidth: 60 },
  flipNum: { ...type.display, fontSize: 30, color: colors.text },
  abs: { position: 'absolute' },
  freeze: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.lg,
    padding: space.md,
    backgroundColor: colors.freezeSoft,
    borderRadius: radius.md,
  },
  freezeText: { ...type.label, color: '#0369A1', flex: 1 },
  actions: { gap: space.md, marginTop: space.xl },
});
