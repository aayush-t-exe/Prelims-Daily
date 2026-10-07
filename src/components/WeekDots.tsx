import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { lastNDays } from '../logic/date';
import type { DayMark } from '../logic/streak';
import { colors, space, type } from '../theme';

const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Last 7 days: done (saffron), freeze (blue snowflake), missed (grey), today (outlined). */
export function WeekDots({ today, history }: { today: string; history: Record<string, DayMark> }) {
  return (
    <View style={styles.row}>
      {lastNDays(today, 7).map((date) => {
        const mark = history[date];
        const isToday = date === today;
        const [y, m, d] = date.split('-').map(Number);
        const weekday = DAY[new Date(y, m - 1, d).getDay()];
        const label = mark === 'done' ? 'done' : mark === 'freeze' ? 'freeze used' : isToday ? 'today, not done yet' : 'missed';
        return (
          <View key={date} style={styles.col} accessible accessibilityLabel={`${date}: ${label}`}>
            <View
              style={[
                styles.dot,
                mark === 'done' && styles.done,
                mark === 'freeze' && styles.freeze,
                !mark && isToday && styles.today,
              ]}
            >
              {mark === 'done' && <Ionicons name="checkmark" size={16} color="#fff" />}
              {mark === 'freeze' && <Ionicons name="snow" size={14} color="#fff" />}
            </View>
            <Text style={[styles.day, isToday && styles.dayToday]}>{weekday}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: space.xs, minWidth: 36 },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { backgroundColor: colors.accent },
  freeze: { backgroundColor: colors.freeze },
  today: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.accent, borderStyle: 'dashed' },
  day: { ...type.caption, color: colors.muted },
  dayToday: { color: colors.text, fontWeight: '700' },
});
