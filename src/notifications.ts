import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays, localDate } from './logic/date';

// Local notifications only: scheduled on the device, so they work offline and in Expo Go.
// Every call is guarded, because expo-notifications has no web implementation.
const supported = Platform.OS !== 'web';
const CHANNEL_ID = 'daily';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Android 13+ only shows the permission prompt once a channel exists, so create it first. */
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#F59E0B',
  });
}

export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const next = await Notifications.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}

const DAILY_KIND = 'daily-reminder';
const TEST_KIND = 'test-reminder';

/** Cancel the daily reminders, but not a test notification that's about to fire. */
async function cancelDailyReminders() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.content.data?.kind !== TEST_KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export interface ReminderInput {
  enabled: boolean;
  hour: number;
  minute: number;
  doneToday: boolean;
  /** answered so far in today's set, and its size */
  answeredToday: number;
  target: number;
  /** daily target for future days (may differ from today's set size after a settings change) */
  nextTarget: number;
  /** the streak still alive on each of the next 7 days if nothing more is done (0 = broken) */
  streakByDay: number[];
}

/** Streak-aware copy. Pure, so it's easy to reason about. */
export function reminderCopy(dayOffset: number, r: ReminderInput): { title: string; body: string } {
  const target = dayOffset === 0 ? r.target : r.nextTarget;
  const streak = r.streakByDay[dayOffset] ?? 0;
  const minutes = Math.max(1, Math.round(target * 0.8));
  if (dayOffset === 0 && r.answeredToday > 0) {
    const left = r.target - r.answeredToday;
    return {
      title: `${left} question${left === 1 ? '' : 's'} left`,
      body: streak > 0 ? `Finish today's set to save your ${streak}-day streak.` : "You're nearly there. Finish today's set.",
    };
  }
  if (streak > 0) {
    return {
      title: `🔥 Your ${streak}-day streak is waiting`,
      body: `${target} questions, about ${minutes} min. Keep the chain going.`,
    };
  }
  return {
    title: "Today's Prelims set is ready",
    body: `${target} questions, about ${minutes} min. Small steps, every day.`,
  };
}

/**
 * Cancel our old reminders, then schedule one-off reminders for the next 7 days.
 * Today is skipped if the set is already done or the time has passed.
 * One-off date triggers (instead of a repeating daily one) let each day have its own copy
 * and let us skip days that are already done.
 */
export async function scheduleNext7Days(r: ReminderInput): Promise<number> {
  if (!supported) return 0;
  try {
    await cancelDailyReminders();
    setNextReminder(null);
    if (!r.enabled) return 0;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return 0;
    await ensureChannel();

    const now = new Date();
    const today = localDate(now);
    let count = 0;
    let first: Date | null = null;
    for (let i = 0; i < 7; i++) {
      if (i === 0 && r.doneToday) continue;
      const [y, m, d] = addDays(today, i).split('-').map(Number);
      const when = new Date(y, m - 1, d, r.hour, r.minute, 0, 0);
      if (when.getTime() <= now.getTime() + 5_000) continue;
      await Notifications.scheduleNotificationAsync({
        content: { ...reminderCopy(i, r), sound: false, data: { kind: DAILY_KIND } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: CHANNEL_ID,
        },
      });
      count++;
      first ??= when;
    }
    setNextReminder(first);
    return count;
  } catch {
    // A reminder failing should never crash the app.
    setNextReminder(null);
    return 0;
  }
}

// --- "Next reminder" status, so the user can see what's actually scheduled ---
let nextReminder: Date | null = null;
const listeners = new Set<() => void>();
function setNextReminder(d: Date | null) {
  nextReminder = d;
  listeners.forEach((l) => l());
}
export const nextReminderStore = {
  get: () => nextReminder,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/** Fires a sample reminder in 5 seconds, to check notifications work on this phone. */
export async function sendTestReminder(): Promise<boolean> {
  if (!supported) return false;
  if (!(await requestPermission())) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Test reminder',
        body: 'Reminders are working. See you at your daily time!',
        data: { kind: TEST_KIND },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
    });
    return true;
  } catch {
    return false;
  }
}

export function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}
