import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { TimePicker } from '@/components/TimePicker';
import { SUBJECT_SHORT, SUBJECTS, type Subject } from '@/data/questions';
import { addDays, localDate } from '@/logic/date';
import { levelFor } from '@/logic/xp';
import { formatTime, nextReminderStore, requestPermission, sendTestReminder } from '@/notifications';
import { subjectAccuracy, useAppStore } from '@/store/useAppStore';
import { colors, radius, space, type } from '@/theme';

function describeDay(d: Date) {
  const today = localDate();
  const day = localDate(d);
  if (day === today) return 'today';
  if (day === addDays(today, 1)) return 'tomorrow';
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
}

function StatTile({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <Card style={styles.tile}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Card>
  );
}

function SubjectBar({ subject, index }: { subject: Subject; index: number }) {
  const stats = useAppStore((s) => s.stats);
  const acc = subjectAccuracy(stats, subject);
  const attempts = stats[subject]?.attempts ?? 0;
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(index * 70, withSpring(acc ?? 0, { damping: 20, stiffness: 100 }));
  }, [acc, fill, index]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  const color = acc === null ? colors.track : acc >= 0.7 ? colors.success : acc >= 0.4 ? colors.accent : colors.error;

  return (
    <View
      style={styles.barRow}
      accessible
      accessibilityLabel={`${subject}: ${acc === null ? 'not attempted yet' : `${Math.round(acc * 100)} percent over ${attempts} questions`}`}
    >
      <View style={styles.barHead}>
        <Text style={styles.barLabel}>{SUBJECT_SHORT[subject]}</Text>
        <Text style={styles.barValue}>{acc === null ? '—' : `${Math.round(acc * 100)}% · ${attempts}`}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, style]} />
      </View>
    </View>
  );
}

export default function Profile() {
  const profile = useAppStore((s) => s.profile)!;
  const stats = useAppStore((s) => s.stats);
  const streak = useAppStore((s) => s.streak);
  const xp = useAppStore((s) => s.xp);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const resetProgress = useAppStore((s) => s.resetProgress);
  const [editingTime, setEditingTime] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [permDenied, setPermDenied] = useState(false);
  const [testState, setTestState] = useState<'idle' | 'sent' | 'failed'>('idle');
  const nextReminder = useSyncExternalStore(nextReminderStore.subscribe, nextReminderStore.get, () => null);
  const doneToday = streak.lastCompletedDate === localDate();

  const totals = SUBJECTS.reduce(
    (t, s) => ({ attempts: t.attempts + (stats[s]?.attempts ?? 0), correct: t.correct + (stats[s]?.correct ?? 0) }),
    { attempts: 0, correct: 0 },
  );
  const accuracy = totals.attempts ? `${Math.round((totals.correct / totals.attempts) * 100)}%` : '—';

  const toggleReminders = async (on: boolean) => {
    if (!on) return updateProfile({ remindersOn: false });
    const granted = await requestPermission();
    setPermDenied(!granted);
    updateProfile({ remindersOn: granted });
  };

  return (
    <Screen>
      <Text style={styles.title}>{profile.name}</Text>
      <Text style={styles.sub}>Prelims {profile.targetYear} · Level {levelFor(xp)}</Text>

      <View style={styles.tiles}>
        <StatTile icon="help-circle-outline" value={String(totals.attempts)} label="answered" />
        <StatTile icon="analytics-outline" value={accuracy} label="accuracy" />
      </View>
      <View style={styles.tiles}>
        <StatTile icon="trophy-outline" value={String(streak.best)} label="best streak" />
        <StatTile icon="star-outline" value={`L${levelFor(xp)}`} label={`${xp} XP`} />
      </View>

      <Text style={styles.section}>Accuracy by subject</Text>
      <Card style={{ gap: space.lg }}>
        {SUBJECTS.map((s, i) => (
          <SubjectBar key={s} subject={s} index={i} />
        ))}
      </Card>

      <Text style={styles.section}>Settings</Text>
      <Card style={{ gap: space.lg }}>
        <View style={{ gap: space.sm }}>
          <Text style={styles.setLabel}>Daily target</Text>
          <Segmented
            options={[5, 10, 15].map((n) => ({ value: n, label: `${n} Qs` }))}
            value={profile.dailyTarget}
            onChange={(n) => updateProfile({ dailyTarget: n })}
          />
          <Text style={styles.hint}>Applies from your next set (or today, if you haven’t started).</Text>
        </View>

        {Platform.OS !== 'web' && (
          <>
            <View style={styles.setRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.setLabel}>Daily reminder</Text>
                <Text style={styles.hint}>Skipped on days you’ve finished.</Text>
              </View>
              <Switch
                value={profile.remindersOn}
                onValueChange={toggleReminders}
                trackColor={{ true: colors.primary, false: colors.track }}
                thumbColor="#fff"
                accessibilityLabel="Daily reminder"
              />
            </View>
            {permDenied && (
              <Text style={[styles.hint, { color: colors.error }]}>
                Notifications are blocked. Enable them for PrelimsDaily in your phone’s settings.
              </Text>
            )}
            {profile.remindersOn && (
              <View style={{ gap: space.md }}>
                <View style={styles.setRow}>
                  <Text style={[styles.setLabel, { flex: 1 }]}>Reminder time</Text>
                  <Button
                    label={editingTime ? 'Done' : formatTime(profile.reminderHour, profile.reminderMinute)}
                    variant="ghost"
                    onPress={() => setEditingTime((e) => !e)}
                    style={{ minHeight: 44 }}
                  />
                </View>
                <Text style={styles.hint}>
                  {nextReminder
                    ? `Next reminder: ${describeDay(nextReminder)}, ${formatTime(nextReminder.getHours(), nextReminder.getMinutes())}`
                    : 'Scheduling…'}
                  {doneToday ? " (today's set is done, so today is skipped)" : ''}
                </Text>
                <Button
                  label={testState === 'sent' ? 'Sent! Arrives in 5 seconds' : 'Send a test reminder'}
                  variant="ghost"
                  icon={<Ionicons name="notifications-outline" size={18} color={colors.primary} />}
                  onPress={async () => {
                    const ok = await sendTestReminder();
                    setTestState(ok ? 'sent' : 'failed');
                    if (!ok) setPermDenied(true);
                  }}
                />
                {editingTime && (
                  <Animated.View entering={FadeIn} exiting={FadeOut}>
                    <TimePicker
                      hour={profile.reminderHour}
                      minute={profile.reminderMinute}
                      onChange={(h, m) => updateProfile({ reminderHour: h, reminderMinute: m })}
                    />
                  </Animated.View>
                )}
              </View>
            )}
          </>
        )}
      </Card>

      <Text style={styles.section}>Danger zone</Text>
      <Card style={{ gap: space.md }}>
        {confirmReset ? (
          // In-app confirm instead of Alert.alert, which doesn't work on web.
          <Animated.View entering={FadeIn} style={{ gap: space.md }}>
            <Text style={styles.setLabel}>Reset all progress?</Text>
            <Text style={styles.hint}>Streak, XP, stats, bookmarks and mistakes will be erased. Your name and settings stay.</Text>
            <View style={styles.confirmRow}>
              <Button label="Cancel" variant="ghost" onPress={() => setConfirmReset(false)} style={{ flex: 1 }} />
              <Button
                label="Reset"
                variant="danger"
                onPress={() => {
                  resetProgress();
                  setConfirmReset(false);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        ) : (
          <Button
            label="Reset progress"
            variant="ghost"
            icon={<Ionicons name="refresh" size={18} color={colors.error} />}
            onPress={() => setConfirmReset(true)}
          />
        )}
      </Card>
      <Text style={styles.footer}>PrelimsDaily · works fully offline</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.text },
  sub: { ...type.label, color: colors.muted, marginTop: 2, marginBottom: space.lg },
  tiles: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  tile: { flex: 1, gap: 2 },
  tileValue: { ...type.display, fontSize: 28, color: colors.text, marginTop: space.xs },
  tileLabel: { ...type.caption, color: colors.muted },
  section: { ...type.heading, color: colors.text, marginTop: space.xl, marginBottom: space.md },
  barRow: { gap: space.sm },
  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { ...type.label, color: colors.text },
  barValue: { ...type.caption, color: colors.muted, fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', width: '100%', transformOrigin: 'left' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  setLabel: { ...type.label, fontSize: 16, color: colors.text },
  hint: { ...type.caption, fontSize: 13, color: colors.muted },
  confirmRow: { flexDirection: 'row', gap: space.md },
  footer: { ...type.caption, color: colors.muted, textAlign: 'center', marginTop: space.xl },
});
