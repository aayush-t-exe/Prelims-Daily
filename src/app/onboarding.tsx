import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { TimePicker } from '@/components/TimePicker';
import { requestPermission } from '@/notifications';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space, type } from '@/theme';

const STEPS = 3;

export default function Onboarding() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [targetYear, setTargetYear] = useState(2027);
  const [dailyTarget, setDailyTarget] = useState(10);
  const [time, setTime] = useState({ hour: 19, minute: 0 });

  // Saving the profile flips the Stack.Protected guard, which routes to the tabs.
  const finish = (remindersOn: boolean) =>
    completeOnboarding({
      name: name.trim() || 'Aspirant',
      targetYear,
      dailyTarget,
      reminderHour: time.hour,
      reminderMinute: time.minute,
      remindersOn,
    });

  const enableReminders = async () => {
    const granted = await requestPermission();
    finish(granted);
  };

  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.page}>
      <View style={styles.dots} accessible accessibilityLabel={`Step ${step + 1} of ${STEPS}`}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotOn, i === step && styles.dotCurrent]} />
        ))}
      </View>

      <Animated.View key={step} entering={FadeInRight.springify().damping(18)} exiting={FadeOutLeft.duration(150)} style={styles.body}>
        {step === 0 && (
          <>
            <View style={styles.logo}>
              <Ionicons name="flame" size={40} color={colors.accent} />
            </View>
            <Text style={styles.title}>Welcome to PrelimsDaily</Text>
            <Text style={styles.lead}>A small set of Prelims questions every day. Build the discipline, the rest follows.</Text>
            <Card style={styles.card}>
              <Text style={styles.label}>What should we call you?</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your first name"
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="done"
                maxLength={24}
                accessibilityLabel="Your first name"
              />
              <Text style={styles.label}>Which Prelims are you targeting?</Text>
              <Segmented
                options={[
                  { value: 2026, label: 'Prelims 2026' },
                  { value: 2027, label: 'Prelims 2027' },
                ]}
                value={targetYear}
                onChange={setTargetYear}
              />
            </Card>
            <Button label="Continue" onPress={() => setStep(1)} />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.title}>Your daily target</Text>
            <Text style={styles.lead}>Pick something you can do even on a busy day. Consistency beats intensity.</Text>
            <View style={styles.targets}>
              {[
                { n: 5, label: 'Light', time: '~4 min' },
                { n: 10, label: 'Steady', time: '~8 min' },
                { n: 15, label: 'Serious', time: '~12 min' },
              ].map((t) => {
                const sel = t.n === dailyTarget;
                return (
                  <Pressable
                    key={t.n}
                    onPress={() => setDailyTarget(t.n)}
                    accessibilityRole="radio"
                    accessibilityLabel={`${t.n} questions a day, ${t.label}`}
                    accessibilityState={{ selected: sel }}
                    style={{ flex: 1 }}
                  >
                    <Card style={[styles.target, sel && styles.targetSel]}>
                      <Text style={[styles.targetN, sel && { color: colors.primary }]}>{t.n}</Text>
                      <Text style={styles.targetLabel}>questions</Text>
                      <Text style={[styles.targetTag, sel && { color: colors.primary }]}>
                        {t.label} · {t.time}
                      </Text>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
            <Button label="Continue" onPress={() => setStep(2)} />
            <Button label="Back" variant="ghost" onPress={() => setStep(0)} />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>Daily reminder</Text>
            <Text style={styles.lead}>
              We’ll nudge you at this time, and skip the nudge on days you’ve already finished.
            </Text>
            <Card style={styles.card}>
              <TimePicker hour={time.hour} minute={time.minute} onChange={(hour, minute) => setTime({ hour, minute })} />
            </Card>
            {Platform.OS === 'web' ? (
              <Button label="Start practising" onPress={() => finish(false)} />
            ) : (
              <>
                <Button
                  label="Turn on reminders"
                  icon={<Ionicons name="notifications" size={18} color="#fff" />}
                  onPress={enableReminders}
                />
                <Button label="Not now" variant="ghost" onPress={() => finish(false)} />
              </>
            )}
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: space.lg },
  dots: { flexDirection: 'row', gap: space.sm, justifyContent: 'center', marginBottom: space.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.track },
  dotOn: { backgroundColor: colors.accent },
  dotCurrent: { width: 24 },
  body: { gap: space.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: { ...type.title, fontSize: 28, color: colors.text, textAlign: 'center' },
  lead: { ...type.body, color: colors.muted, textAlign: 'center', marginTop: -space.sm },
  card: { gap: space.md },
  label: { ...type.label, color: colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  targets: { flexDirection: 'row', gap: space.md },
  target: { alignItems: 'center', paddingVertical: space.xl, borderWidth: 2, borderColor: 'transparent' },
  targetSel: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  targetN: { ...type.display, color: colors.text },
  targetLabel: { ...type.caption, color: colors.muted },
  targetTag: { ...type.caption, color: colors.muted, marginTop: space.sm, textAlign: 'center' },
});
