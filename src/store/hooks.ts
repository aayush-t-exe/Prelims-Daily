import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { addDays, localDate } from '../logic/date';
import { liveStreak } from '../logic/streak';
import { scheduleNext7Days } from '../notifications';
import { useAppStore } from './useAppStore';

/** AsyncStorage is async, so the store starts empty. Wait for it before deciding where to route. */
export function useHydrated() {
  return useSyncExternalStore(
    (onChange) => useAppStore.persist.onFinishHydration(onChange),
    () => useAppStore.persist.hasHydrated(),
    // Static web rendering has no storage: render the "not hydrated yet" state.
    () => false,
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

// Runs are chained so two reschedules never interleave (one's cancelAll landing
// mid-way through another's loop would leave duplicate reminders behind).
let chain: Promise<unknown> = Promise.resolve();
let debounce: ReturnType<typeof setTimeout> | null = null;

function rescheduleNow() {
  chain = chain.then(() => {
    const s = useAppStore.getState();
    if (!s.profile) return;
    const today = localDate();
    const p = s.progress?.date === today && s.progress.round === 0 ? s.progress : null;
    return scheduleNext7Days({
      enabled: s.profile.remindersOn,
      hour: s.profile.reminderHour,
      minute: s.profile.reminderMinute,
      doneToday: s.streak.lastCompletedDate === today,
      answeredToday: p ? Object.keys(p.answers).length : 0,
      target: p ? p.setIds.length : s.profile.dailyTarget,
      nextTarget: s.profile.dailyTarget,
      // If the user does nothing more, what streak is still saveable on each day?
      streakByDay: Array.from({ length: 7 }, (_, i) => liveStreak(s.streak, addDays(today, i))),
    });
  });
}

/** Settings can change many times a second (hold-to-scroll time picker), so wait for a pause. */
function reschedule(delay = 0) {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(rescheduleNow, delay);
}

/**
 * Keeps the 7 scheduled reminders in sync: on app open/foreground, when going to the
 * background (so "N questions left" copy is current), when the set is completed,
 * and when reminder settings change. Mounted once in the root layout.
 */
export function useReminderSync() {
  useEffect(() => {
    reschedule();
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active' || s === 'background') reschedule();
    });
    const storeUnsub = useAppStore.subscribe((s, prev) => {
      const settingsChanged =
        s.profile?.remindersOn !== prev.profile?.remindersOn ||
        s.profile?.reminderHour !== prev.profile?.reminderHour ||
        s.profile?.reminderMinute !== prev.profile?.reminderMinute ||
        s.profile?.dailyTarget !== prev.profile?.dailyTarget;
      const completedChanged = s.streak.lastCompletedDate !== prev.streak.lastCompletedDate;
      if (completedChanged) reschedule();
      else if (settingsChanged) reschedule(600);
    });
    return () => {
      appSub.remove();
      storeUnsub();
    };
  }, []);
}
