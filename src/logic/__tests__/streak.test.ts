import { describe, expect, it } from '@jest/globals';
import {
  FREEZE_EVERY,
  MAX_FREEZES,
  StreakState,
  applyCompletion,
  initialStreak,
  liveStreak,
} from '../streak';
import { addDays } from '../date';

const DAY = '2026-10-07';

/** Complete `days` consecutive days starting at `start`; returns the final state. */
function completeRun(start: string, days: number, from: StreakState = initialStreak): StreakState {
  let s = from;
  for (let i = 0; i < days; i++) s = applyCompletion(s, addDays(start, i)).state;
  return s;
}

const state = (overrides: Partial<StreakState>): StreakState => ({ ...initialStreak, ...overrides });

describe('applyCompletion', () => {
  it('starts a streak of 1 on the first completion', () => {
    const r = applyCompletion(initialStreak, DAY);
    expect(r.counted).toBe(true);
    expect(r.before).toBe(0);
    expect(r.state).toMatchObject({ current: 1, best: 1, lastCompletedDate: DAY });
    expect(r.state.history).toEqual({ [DAY]: 'done' });
  });

  it('adds 1 for a consecutive day', () => {
    const s = completeRun(DAY, 1);
    const r = applyCompletion(s, addDays(DAY, 1));
    expect(r.state.current).toBe(2);
    expect(r.before).toBe(1);
    expect(r.usedFreeze).toBe(false);
  });

  it('does nothing when the same day is completed twice', () => {
    const s = completeRun(DAY, 1);
    const r = applyCompletion(s, DAY);
    expect(r.counted).toBe(false);
    expect(r.state).toBe(s); // same object: no change at all
  });

  it('does not mutate the input state', () => {
    const s = completeRun(DAY, 1);
    const snapshot = JSON.parse(JSON.stringify(s));
    applyCompletion(s, addDays(DAY, 1));
    expect(s).toEqual(snapshot);
  });

  describe('one missed day', () => {
    const lastDone = '2026-10-05';
    const skipped = '2026-10-06';

    it('spends a freeze to keep the streak and marks the missed day', () => {
      const s = state({ current: 4, best: 4, lastCompletedDate: lastDone, freezes: 1 });
      const r = applyCompletion(s, DAY);
      expect(r.usedFreeze).toBe(true);
      expect(r.state.current).toBe(5);
      expect(r.state.freezes).toBe(0);
      expect(r.state.history[skipped]).toBe('freeze');
      expect(r.state.history[DAY]).toBe('done');
    });

    it('resets to 1 without a freeze', () => {
      const s = state({ current: 4, best: 4, lastCompletedDate: lastDone, freezes: 0 });
      const r = applyCompletion(s, DAY);
      expect(r.usedFreeze).toBe(false);
      expect(r.state.current).toBe(1);
      expect(r.state.history[skipped]).toBeUndefined();
    });
  });

  it('resets to 1 after 2+ missed days, even with freezes in hand', () => {
    const s = state({ current: 6, best: 6, lastCompletedDate: '2026-10-04', freezes: 2 });
    const r = applyCompletion(s, DAY);
    expect(r.state.current).toBe(1);
    expect(r.usedFreeze).toBe(false);
    expect(r.state.freezes).toBe(2); // not wasted on an unrecoverable gap
  });

  it(`earns a freeze on reaching a ${FREEZE_EVERY}-day streak`, () => {
    const six = completeRun(DAY, 6);
    expect(six.freezes).toBe(0);
    const r = applyCompletion(six, addDays(DAY, 6));
    expect(r.state.current).toBe(7);
    expect(r.earnedFreeze).toBe(true);
    expect(r.state.freezes).toBe(1);
  });

  it(`caps freezes at MAX_FREEZES (${MAX_FREEZES})`, () => {
    const s = state({ current: 13, best: 13, lastCompletedDate: addDays(DAY, -1), freezes: MAX_FREEZES });
    const r = applyCompletion(s, DAY);
    expect(r.state.current).toBe(14);
    expect(r.earnedFreeze).toBe(false);
    expect(r.state.freezes).toBe(MAX_FREEZES);
  });

  it('accumulates freezes across milestones but never beyond the cap', () => {
    expect(completeRun(DAY, 14).freezes).toBe(2);
    expect(completeRun(DAY, 21).freezes).toBe(MAX_FREEZES);
  });

  it('keeps the best streak after a reset', () => {
    const five = completeRun(DAY, 5);
    const restarted = applyCompletion(five, addDays(DAY, 10)).state;
    expect(restarted.current).toBe(1);
    expect(restarted.best).toBe(5);
  });
});

describe('liveStreak', () => {
  const s = state({ current: 5, best: 5, lastCompletedDate: '2026-10-05', freezes: 0 });

  it('is 0 with no history', () => {
    expect(liveStreak(initialStreak, DAY)).toBe(0);
  });

  it('shows the current streak when completed today or yesterday', () => {
    expect(liveStreak(s, '2026-10-05')).toBe(5);
    expect(liveStreak(s, '2026-10-06')).toBe(5);
  });

  it('shows the current streak after one missed day if a freeze can cover it', () => {
    expect(liveStreak({ ...s, freezes: 1 }, DAY)).toBe(5);
  });

  it('is 0 after one missed day without a freeze', () => {
    expect(liveStreak(s, DAY)).toBe(0);
  });

  it('is 0 after 2+ missed days, even with freezes', () => {
    expect(liveStreak({ ...s, freezes: 2 }, '2026-10-08')).toBe(0);
  });
});
