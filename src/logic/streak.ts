import { addDays, daysBetween } from './date';

export type DayMark = 'done' | 'freeze';

export interface StreakState {
  current: number;
  best: number;
  lastCompletedDate: string | null;
  freezes: number;
  /** date → how the day was kept alive */
  history: Record<string, DayMark>;
}

export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;

export const initialStreak: StreakState = {
  current: 0,
  best: 0,
  lastCompletedDate: null,
  freezes: 0,
  history: {},
};

export interface CompletionResult {
  state: StreakState;
  /** false when today was already completed (no change at all). */
  counted: boolean;
  usedFreeze: boolean;
  earnedFreeze: boolean;
  before: number;
}

/**
 * Pure: completing today's set → the next streak state.
 * - last day = yesterday → +1
 * - exactly one missed day and a freeze in hand → spend it, streak continues
 * - anything else → reset to 1
 */
export function applyCompletion(s: StreakState, today: string): CompletionResult {
  const before = s.current;
  if (s.lastCompletedDate === today) {
    return { state: s, counted: false, usedFreeze: false, earnedFreeze: false, before };
  }

  const gap = s.lastCompletedDate ? daysBetween(s.lastCompletedDate, today) : Infinity;
  const history = { ...s.history, [today]: 'done' as const };
  let freezes = s.freezes;
  let current: number;
  let usedFreeze = false;

  if (gap === 1) {
    current = s.current + 1;
  } else if (gap === 2 && freezes > 0 && s.current > 0) {
    freezes -= 1;
    usedFreeze = true;
    history[addDays(today, -1)] = 'freeze';
    current = s.current + 1;
  } else {
    current = 1;
  }

  let earnedFreeze = false;
  if (current % FREEZE_EVERY === 0 && freezes < MAX_FREEZES) {
    freezes += 1;
    earnedFreeze = true;
  }

  return {
    state: {
      current,
      best: Math.max(s.best, current),
      lastCompletedDate: today,
      freezes,
      history,
    },
    counted: true,
    usedFreeze,
    earnedFreeze,
    before,
  };
}

/**
 * The streak as the user should see it right now. It's still "alive" if they did
 * yesterday (or today), or missed one day but have a freeze to cover it.
 */
export function liveStreak(s: StreakState, today: string): number {
  if (!s.lastCompletedDate) return 0;
  const gap = daysBetween(s.lastCompletedDate, today);
  if (gap <= 1) return s.current;
  if (gap === 2 && s.freezes > 0) return s.current;
  return 0;
}
