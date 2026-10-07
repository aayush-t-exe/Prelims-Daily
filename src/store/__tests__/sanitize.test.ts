import { describe, expect, it } from '@jest/globals';

import { sanitize } from '../useAppStore';

const good = {
  profile: { name: 'A', targetYear: 2027, dailyTarget: 10, reminderHour: 19, reminderMinute: 0, remindersOn: true },
  progress: {
    date: '2026-10-07',
    round: 0,
    setIds: ['pol-001', 'pol-002'],
    answers: { 'pol-001': 1 },
    completed: false,
    servedToday: ['pol-001', 'pol-002'],
  },
  streak: { current: 3, best: 5, lastCompletedDate: '2026-10-06', freezes: 1, history: {} },
  xp: 120,
  stats: { Polity: { attempts: 4, correct: 2 } },
  lastSeen: { 'pol-001': '2026-10-07' },
  bookmarks: ['pol-001'],
  mistakes: ['pol-002'],
  lastResult: null,
};

describe('sanitize (loading saved state)', () => {
  it('keeps a valid saved state', () => {
    const s = sanitize(good);
    expect(s.xp).toBe(120);
    expect(s.progress?.setIds).toEqual(['pol-001', 'pol-002']);
    expect(s.streak.current).toBe(3);
  });

  it('falls back to defaults for garbage instead of crashing', () => {
    for (const junk of [null, undefined, 42, 'x', [], { xp: 'lots' }, { streak: null, xp: 1 }]) {
      const s = sanitize(junk);
      expect(s.profile).toBeNull();
      expect(s.xp).toBe(0);
    }
  });

  it('drops a saved set that references a question no longer in the bank (no soft-lock)', () => {
    const s = sanitize({ ...good, progress: { ...good.progress, setIds: ['pol-001', 'gone-999'] } });
    expect(s.progress).toBeNull();
    expect(s.xp).toBe(120); // the rest survives
  });

  it('drops a partial saved set', () => {
    const { servedToday: _omit, ...partial } = good.progress;
    expect(sanitize({ ...good, progress: partial }).progress).toBeNull();
  });

  it('repairs secondary fields individually', () => {
    const s = sanitize({
      ...good,
      lastSeen: null,
      stats: [],
      streak: { ...good.streak, history: 'bad' },
      bookmarks: ['pol-001', 'gone-999', 7],
    });
    expect(s.lastSeen).toEqual({});
    expect(s.stats).toEqual({});
    expect(s.streak.history).toEqual({});
    expect(s.bookmarks).toEqual([]);
  });

  it('filters out bookmark ids that no longer exist', () => {
    expect(sanitize({ ...good, bookmarks: ['pol-001', 'gone-999'] }).bookmarks).toEqual(['pol-001']);
  });
});
