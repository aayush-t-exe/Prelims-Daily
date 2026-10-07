import { describe, expect, it } from '@jest/globals';
import { QUESTIONS, Subject } from '../../data/questions';
import { DailySetInput, SubjectStats, buildDailySet, weakSubjects } from '../dailySet';

const TODAY = '2026-10-07';
const subjectOf = (id: string) => QUESTIONS.find((q) => q.id === id)!.subject;

const build = (overrides: Partial<DailySetInput> = {}) =>
  buildDailySet({
    questions: QUESTIONS,
    seed: TODAY,
    today: TODAY,
    count: 10,
    stats: {},
    lastSeen: {},
    ...overrides,
  });

/** Stats where History and Economy are clearly weak and everything else is strong. */
const weakStats: SubjectStats = {
  Polity: { attempts: 10, correct: 9 },
  History: { attempts: 10, correct: 2 },
  Geography: { attempts: 10, correct: 8 },
  Economy: { attempts: 10, correct: 3 },
  'Environment & Ecology': { attempts: 10, correct: 9 },
  'Science & Technology': { attempts: 10, correct: 7 },
};

describe('question bank sanity', () => {
  it('has 60 questions, 10 per subject, with unique ids', () => {
    expect(QUESTIONS).toHaveLength(60);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(60);
  });
});

describe('buildDailySet', () => {
  it('is deterministic for the same seed and date', () => {
    expect(build()).toEqual(build());
  });

  it('gives a different set on different dates', () => {
    const dates = ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
    const sets = dates.map((d) => build({ seed: d, today: d }).join(','));
    expect(new Set(sets).size).toBe(dates.length);
  });

  it.each([1, 5, 10, 25, 60])('returns exactly %i unique, valid ids', (count) => {
    const ids = build({ count });
    expect(ids).toHaveLength(count);
    expect(new Set(ids).size).toBe(count);
    ids.forEach((id) => expect(QUESTIONS.some((q) => q.id === id)).toBe(true));
  });

  it('never returns more than the bank holds', () => {
    expect(build({ count: 100 })).toHaveLength(QUESTIONS.length);
  });

  it('avoids questions seen in the last 3 days when enough others exist', () => {
    const recentDates = ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'];
    const lastSeen: Record<string, string> = {};
    QUESTIONS.slice(0, 40).forEach((q, i) => {
      lastSeen[q.id] = recentDates[i % recentDates.length];
    });
    const ids = build({ lastSeen });
    ids.forEach((id) => expect(lastSeen[id]).toBeUndefined());
  });

  it('treats questions seen more than 3 days ago as fresh again', () => {
    const lastSeen = Object.fromEntries(QUESTIONS.map((q) => [q.id, '2026-10-03']));
    expect(build({ lastSeen })).toHaveLength(10);
  });

  it('still returns `count` questions when the fresh pool is too small, topping up from recent', () => {
    // Everything except 4 questions was seen yesterday.
    const freshIds = QUESTIONS.slice(0, 4).map((q) => q.id);
    const lastSeen = Object.fromEntries(QUESTIONS.slice(4).map((q) => [q.id, '2026-10-06']));
    const ids = build({ lastSeen });
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    freshIds.forEach((id) => expect(ids).toContain(id)); // fresh ones are always used first
  });

  it('respects the exclude list when possible', () => {
    const exclude = QUESTIONS.slice(0, 50).map((q) => q.id);
    const ids = build({ exclude });
    ids.forEach((id) => expect(exclude).not.toContain(id));
  });

  it('falls back to excluded questions only when nothing else is left', () => {
    const exclude = QUESTIONS.slice(0, 55).map((q) => q.id);
    const ids = build({ exclude });
    expect(ids).toHaveLength(10);
    expect(ids.filter((id) => !exclude.includes(id))).toHaveLength(5); // all 5 allowed ones used
  });

  describe('weak-subject weighting', () => {
    const weak: Subject[] = ['History', 'Economy'];
    const weakPicks = (ids: string[]) => ids.filter((id) => weak.includes(subjectOf(id))).length;

    it.each([10, 7, 5])('draws Math.round(n/2) of %i picks from the 2 weakest subjects', (count) => {
      expect(weakPicks(build({ stats: weakStats, count }))).toBe(Math.round(count / 2));
    });

    it('holds across a month of different days', () => {
      for (let day = 1; day <= 30; day++) {
        const date = `2026-11-${String(day).padStart(2, '0')}`;
        expect(weakPicks(build({ stats: weakStats, seed: date, today: date }))).toBe(5);
      }
    });

    it('leaves the set unweighted when there is not enough data (< 3 attempts)', () => {
      const thin: SubjectStats = {
        History: { attempts: 2, correct: 0 },
        Economy: { attempts: 2, correct: 0 },
      };
      expect(build({ stats: thin })).toEqual(build({ stats: {} }));
    });
  });
});

describe('weakSubjects', () => {
  it('returns the 2 lowest-accuracy subjects, weakest first', () => {
    expect(weakSubjects(weakStats)).toEqual(['History', 'Economy']);
  });

  it('ignores subjects with fewer than 3 attempts', () => {
    expect(
      weakSubjects({ History: { attempts: 2, correct: 0 }, Economy: { attempts: 1, correct: 0 } }),
    ).toEqual([]);
  });

  it('ignores subjects answered perfectly', () => {
    expect(weakSubjects({ Polity: { attempts: 5, correct: 5 } })).toEqual([]);
  });
});
