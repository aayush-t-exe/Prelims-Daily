import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTime } from '../notifications';
import { colors, radius, space, type } from '../theme';
import { Chip } from './Chip';

interface Props {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

const PRESETS: [number, number][] = [
  [6, 30],
  [9, 0],
  [13, 0],
  [19, 0],
  [21, 30],
];

/** Hold-to-repeat stepper button. */
function Step({ icon, label, onStep }: { icon: 'chevron-up' | 'chevron-down'; label: string; onStep: () => void }) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Latest onStep for the repeating interval (avoids a stale closure while holding).
  const stepRef = useRef(onStep);
  useEffect(() => {
    stepRef.current = onStep;
  });
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onStep}
      onLongPress={() => (timer.current = setInterval(() => stepRef.current(), 90))}
      onPressOut={stop}
      delayLongPress={350}
      style={({ pressed }) => [styles.step, pressed && { backgroundColor: colors.primarySoft }]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
    </Pressable>
  );
}

/** A tiny dependency-free time picker: presets plus hour/minute steppers (hold to scroll). */
export function TimePicker({ hour, minute, onChange }: Props) {
  const total = hour * 60 + minute;
  const set = (mins: number) => {
    const m = ((mins % 1440) + 1440) % 1440;
    onChange(Math.floor(m / 60), m % 60);
  };
  const h12 = hour % 12 === 0 ? 12 : hour % 12;

  return (
    <View style={styles.wrap}>
      <View style={styles.row} accessible={false}>
        <View style={styles.col}>
          <Step icon="chevron-up" label="Hour later" onStep={() => set(total + 60)} />
          <Text style={styles.big}>{h12}</Text>
          <Step icon="chevron-down" label="Hour earlier" onStep={() => set(total - 60)} />
        </View>
        <Text style={styles.big}>:</Text>
        <View style={styles.col}>
          <Step icon="chevron-up" label="Minute later" onStep={() => set(total + 1)} />
          <Text style={styles.big}>{String(minute).padStart(2, '0')}</Text>
          <Step icon="chevron-down" label="Minute earlier" onStep={() => set(total - 1)} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${hour < 12 ? 'PM' : 'AM'}`}
          onPress={() => set(total + 720)}
          style={styles.ampm}
        >
          <Text style={styles.ampmText}>{hour < 12 ? 'AM' : 'PM'}</Text>
        </Pressable>
      </View>
      <View style={styles.presets}>
        {PRESETS.map(([h, m]) => (
          <Chip key={`${h}${m}`} label={formatTime(h, m)} selected={h === hour && m === minute} onPress={() => onChange(h, m)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  col: { alignItems: 'center' },
  step: { width: 48, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  big: { ...type.display, fontSize: 44, color: colors.text, minWidth: 56, textAlign: 'center' },
  ampm: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    marginLeft: space.sm,
  },
  ampmText: { ...type.heading, color: colors.primary },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
});
