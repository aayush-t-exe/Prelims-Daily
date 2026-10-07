import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { LevelBar } from '@/components/LevelBar';
import { ProgressRing } from '@/components/ProgressRing';
import { Screen } from '@/components/Screen';
import { StreakFlame } from '@/components/StreakFlame';
import { WeekDots } from '@/components/WeekDots';
import { SUBJECT_SHORT } from '@/data/questions';
import { weakSubjects } from '@/logic/dailySet';
import { daysToPrelims } from '@/logic/date';
import { liveStreak } from '@/logic/streak';
import { useToday } from '@/store/hooks';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space, type } from '@/theme';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Today() {
  const today = useToday();
  const profile = useAppStore((s) => s.profile)!;
  const streak = useAppStore((s) => s.streak);
  const xp = useAppStore((s) => s.xp);
  const stats = useAppStore((s) => s.stats);
  const progress = useAppStore((s) => s.progress);
  const startPracticeRound = useAppStore((s) => s.startPracticeRound);

  const current = progress?.date === today ? progress : null;
  const doneToday = streak.lastCompletedDate === today;
  const answered = current ? Object.keys(current.answers).length : 0;
  const total = current?.setIds.length ?? profile.dailyTarget;
  const weak = useMemo(() => weakSubjects(stats), [stats]);

  // Ring shows the daily set. After it's done it stays full, even during practice rounds.
  const ringValue = doneToday ? 1 : current && current.round === 0 ? answered / total : 0;
  const shownAnswered = doneToday ? total : current?.round === 0 ? answered : 0;
  const inPractice = doneToday && current && current.round > 0 && !current.completed;

  let cta: { label: string; onPress: () => void; variant: 'primary' | 'ghost' };
  if (!doneToday) {
    cta =
      answered > 0
        ? { label: `Continue (${answered}/${total})`, onPress: () => router.push('/quiz'), variant: 'primary' }
        : { label: "Start today's set", onPress: () => router.push('/quiz'), variant: 'primary' };
  } else if (inPractice) {
    cta = { label: `Continue practice (${answered}/${total})`, onPress: () => router.push('/quiz'), variant: 'ghost' };
  } else {
    cta = {
      label: 'Practise more',
      onPress: () => {
        startPracticeRound();
        router.push('/quiz');
      },
      variant: 'ghost',
    };
  }

  const shown = liveStreak(streak, today);
  const daysLeft = daysToPrelims(today, profile.targetYear);

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>
            {greeting()}, {profile.name}
          </Text>
          <Text style={styles.sub}>
            Prelims {profile.targetYear} · {daysLeft} days to go <Text style={styles.approx}>(approx.)</Text>
          </Text>
        </View>
        <View style={styles.freeze} accessible accessibilityLabel={`${streak.freezes} streak freezes`}>
          <Ionicons name="snow" size={16} color={colors.freeze} />
          <Text style={styles.freezeText}>{streak.freezes}</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <Card style={styles.hero}>
          <View style={styles.heroTop}>
            <StreakFlame count={shown} />
            <ProgressRing progress={ringValue} size={128} stroke={12}>
              <Text style={styles.ringNum}>
                {shownAnswered}
                <Text style={styles.ringOf}>/{total}</Text>
              </Text>
              <Text style={styles.ringLabel}>today</Text>
            </ProgressRing>
          </View>
          <WeekDots today={today} history={streak.history} />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.ctaWrap}>
        {doneToday && (
          <View style={styles.doneBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.doneText}>Done for today. See you tomorrow!</Text>
          </View>
        )}
        <Button label={cta.label} onPress={cta.onPress} variant={cta.variant} accessibilityHint="Opens the quiz" />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(400)}>
        <Card style={styles.section}>
          <LevelBar xp={xp} />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320).duration(400)}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Focus on your weak areas</Text>
          {weak.length > 0 ? (
            <>
              <View style={styles.chips}>
                {weak.map((s) => {
                  const st = stats[s]!;
                  return <Chip key={s} tone="warn" label={`${SUBJECT_SHORT[s]} · ${Math.round((st.correct / st.attempts) * 100)}%`} />;
                })}
              </View>
              <Text style={styles.hint}>About half of tomorrow’s questions will come from these.</Text>
            </>
          ) : (
            <Text style={styles.hint}>Answer a few questions in each subject and we’ll tailor your daily set to your weak spots.</Text>
          )}
        </Card>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg, gap: space.md },
  hello: { ...type.title, color: colors.text },
  sub: { ...type.label, color: colors.muted, marginTop: 2 },
  approx: { ...type.caption, color: colors.muted, fontWeight: '400' },
  freeze: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.freezeSoft,
    paddingHorizontal: space.md,
    minHeight: 36,
    borderRadius: radius.pill,
  },
  freezeText: { ...type.label, color: '#0369A1' },
  hero: { gap: space.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ringNum: { ...type.display, fontSize: 34, color: colors.text },
  ringOf: { fontSize: 18, color: colors.muted, fontWeight: '600' },
  ringLabel: { ...type.caption, color: colors.muted },
  ctaWrap: { marginVertical: space.lg, gap: space.md },
  doneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.successSoft,
    padding: space.md,
    borderRadius: radius.md,
  },
  doneText: { ...type.label, color: '#166534' },
  section: { marginBottom: space.lg, gap: space.md },
  sectionTitle: { ...type.heading, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hint: { ...type.body, fontSize: 14, color: colors.muted },
});
