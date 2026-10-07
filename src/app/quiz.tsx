import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, tapHaptic } from '@/components/Button';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { XPChip } from '@/components/XPChip';
import { getQuestion, SUBJECT_SHORT } from '@/data/questions';
import { useAppStore } from '@/store/useAppStore';
import { colors, MAX_WIDTH, radius, shadow, space, type } from '@/theme';

const haptic = (kind: Haptics.NotificationFeedbackType) => {
  if (Platform.OS !== 'web') void Haptics.notificationAsync(kind);
};

export default function Quiz() {
  const ensureTodaySet = useAppStore((s) => s.ensureTodaySet);
  const progress = useAppStore((s) => s.progress);
  const xp = useAppStore((s) => s.xp);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const answer = useAppStore((s) => s.answer);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const completeSet = useAppStore((s) => s.completeSet);

  // Create today's set if missing, then resume at the first unanswered question.
  const [index, setIndex] = useState(() => {
    const p = ensureTodaySet();
    const firstOpen = p.setIds.findIndex((id) => !(id in p.answers));
    return firstOpen === -1 ? p.setIds.length - 1 : firstOpen;
  });
  const [chips, setChips] = useState<{ key: number; amount: number }[]>([]);
  const chipKey = useRef(0);

  // Header XP counter "pops" whenever XP changes.
  const xpScale = useSharedValue(1);
  const prevXp = useRef(xp);
  useEffect(() => {
    if (xp > prevXp.current) {
      xpScale.value = withSequence(withTiming(1, { duration: 520 }), withSpring(1.25, { damping: 6 }), withSpring(1));
    }
    prevXp.current = xp;
  }, [xp, xpScale]);
  const xpStyle = useAnimatedStyle(() => ({ transform: [{ scale: xpScale.value }] }));

  const total = progress?.setIds.length ?? 0;
  const answeredCount = progress ? Object.keys(progress.answers).length : 0;

  // Progress bar animates scaleX (a transform) rather than width, so it never triggers layout.
  const bar = useSharedValue(0);
  useEffect(() => {
    bar.value = withSpring(total ? answeredCount / total : 0, { damping: 20, stiffness: 140 });
  }, [answeredCount, total, bar]);
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: bar.value }] }));

  const removeChip = useCallback((key: number) => setChips((c) => c.filter((x) => x.key !== key)), []);

  if (!progress) return null;
  const id = progress.setIds[index];
  const q = getQuestion(id);
  if (!q) return null;

  const chosen = progress.answers[id];
  const locked = chosen !== undefined;
  const isLast = index === total - 1;
  const bookmarked = bookmarks.includes(id);

  const onChoose = (i: number) => {
    if (locked) return;
    const res = answer(id, i);
    if (!res) return;
    if (res.correct) {
      haptic(Haptics.NotificationFeedbackType.Success);
      const key = ++chipKey.current;
      setChips((c) => [...c, { key, amount: res.xp }]);
    } else {
      haptic(Haptics.NotificationFeedbackType.Error);
    }
  };

  const onNext = () => {
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    const result = completeSet();
    if (result) router.replace('/result');
  };

  const stateFor = (i: number): OptionState => {
    if (!locked) return 'idle';
    if (i === chosen) return i === q.answerIndex ? 'correct' : 'wrong';
    if (i === q.answerIndex) return 'reveal';
    return 'dim';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.page}>
        {/* Header: close · progress · XP */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close quiz. Your progress is saved."
            hitSlop={10}
            style={styles.iconBtn}
          >
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <View style={styles.barTrack} accessible accessibilityLabel={`${answeredCount} of ${total} answered`}>
            <Animated.View style={[styles.barFill, barStyle]} />
          </View>
          <Animated.View style={[styles.xp, xpStyle]} accessible accessibilityLabel={`${xp} XP`}>
            <Ionicons name="star" size={14} color={colors.accent} />
            <Text style={styles.xpText}>{xp}</Text>
          </Animated.View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Keyed by question id: a new card slides in, the old one slides out. */}
          <Animated.View
            key={id}
            entering={FadeInRight.springify().damping(18).stiffness(160)}
            exiting={FadeOutLeft.duration(180)}
            layout={LinearTransition.springify().damping(20)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.meta}>
                {progress.round > 0 ? 'Practice · ' : ''}Q{index + 1} of {total} · {SUBJECT_SHORT[q.subject]} ·{' '}
                <Text style={{ textTransform: 'capitalize' }}>{q.difficulty}</Text>
              </Text>
              <Pressable
                onPress={() => {
                  tapHaptic();
                  toggleBookmark(id);
                }}
                accessibilityRole="button"
                accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
                accessibilityState={{ selected: bookmarked }}
                hitSlop={12}
                style={styles.iconBtn}
              >
                <Ionicons name={bookmarked ? 'star' : 'star-outline'} size={24} color={bookmarked ? colors.accent : colors.muted} />
              </Pressable>
            </View>

            <Text style={styles.question}>{q.question}</Text>

            <View style={styles.options}>
              {q.options.map((opt, i) => (
                <OptionButton key={i} index={i} text={opt} state={stateFor(i)} disabled={locked} onPress={() => onChoose(i)} />
              ))}
            </View>

            {locked && (
              <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.explain}>
                <View style={styles.explainHead}>
                  <Ionicons
                    name={chosen === q.answerIndex ? 'checkmark-circle' : 'information-circle'}
                    size={20}
                    color={chosen === q.answerIndex ? colors.success : colors.primary}
                  />
                  <Text style={styles.explainTitle}>{chosen === q.answerIndex ? 'Correct!' : 'Explanation'}</Text>
                </View>
                <Text style={styles.explainBody}>{q.explanation}</Text>
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>

        {locked && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.footer}>
            <Button label={isLast ? 'See results' : 'Next'} onPress={onNext} variant={isLast ? 'accent' : 'primary'} />
          </Animated.View>
        )}

        {chips.map((c) => (
          <XPChip key={c.key} amount={c.amount} onDone={() => removeChip(c.key)} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  barTrack: { flex: 1, height: 10, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
  barFill: { height: '100%', width: '100%', backgroundColor: colors.accent, transformOrigin: 'left' },
  xp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    minHeight: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  xpText: { ...type.label, color: '#92400E', fontVariant: ['tabular-nums'] },
  scroll: { padding: space.lg, paddingBottom: space.xxl },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.lg, ...shadow },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -space.sm },
  meta: { ...type.caption, color: colors.muted, flex: 1 },
  question: { ...type.body, fontSize: 18, lineHeight: 27, fontWeight: '600', color: colors.text },
  options: { gap: space.md },
  explain: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: space.lg, gap: space.sm },
  explainHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  explainTitle: { ...type.label, color: colors.primary },
  explainBody: { ...type.body, fontSize: 15, color: colors.text },
  footer: { paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.sm },
});
