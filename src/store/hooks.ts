import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { localDate } from '../logic/date';
import { liveStreak } from '../logic/streak';
import { scheduleNext7Days } from '../notifications';
import { useAppStore } from './useAppStore';

/** AsyncStorage is async, so the store starts empty. Wait for it before deciding where to route. */
export function useHydrated() {
  return useSyncExternalStore(
    (onChange) => useAppStore.persist.onFinishHydration(onChange),
    () => useAppStore.persist.hasHydrated(),
  );
}

/** Today's local date, refreshed when the app comes back to the foreground (handles midnight). */
export function useToday() {
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setToday(localDate());
    });
    return () => sub.remove();
  }, []);
  return today;
}

export function isDoneToday(lastCompletedDate: string | null, today: string) {
  return lastCompletedDate === today;
}

function reschedule() {
  const s = useAppStore.getState();
  if (!s.profile) return;
  const today = localDate();
  const p = s.progress?.date === today && s.progress.round === 0 ? s.progress : null;
  void scheduleNext7Days({
    enabled: s.profile.remindersOn,
    hour: s.profile.reminderHour,
    minute: s.profile.reminderMinute,
    doneToday: s.streak.lastCompletedDate === today,
    answeredToday: p ? Object.keys(p.answers).length : 0,
    target: p ? p.setIds.length : s.profile.dailyTarget,
    streak: liveStreak(s.streak, today),
  });
}

/**
 * Keeps the 7 scheduled reminders in sync: on app foreground, when the set is completed,
 * and when reminder settings change. Mounted once in the root layout.
 */
export function useReminderSync() {
  useEffect(() => {
    reschedule();
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') reschedule();
    });
    const storeUnsub = useAppStore.subscribe((s, prev) => {
      const settingsChanged =
        s.profile?.remindersOn !== prev.profile?.remindersOn ||
        s.profile?.reminderHour !== prev.profile?.reminderHour ||
        s.profile?.reminderMinute !== prev.profile?.reminderMinute ||
        s.profile?.dailyTarget !== prev.profile?.dailyTarget;
      const completedChanged = s.streak.lastCompletedDate !== prev.streak.lastCompletedDate;
      if (settingsChanged || completedChanged) reschedule();
    });
    return () => {
      appSub.remove();
      storeUnsub();
    };
  }, []);
}
