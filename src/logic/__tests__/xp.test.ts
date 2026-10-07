import { describe, expect, it } from '@jest/globals';
import { XP, completionBonus, levelFor, levelProgress, xpAtLevel, xpForAnswer } from '../xp';

describe('xpForAnswer', () => {
  it('awards attempt XP for a wrong answer', () => {
    expect(xpForAnswer(false)).toBe(XP.perAttempt); // 2
  });

  it('awards attempt + correct XP for a right answer', () => {
    expect(xpForAnswer(true)).toBe(XP.perAttempt + XP.perCorrect); // 12
  });
});

describe('completionBonus', () => {
  it('is the base bonus plus 5 XP per streak day', () => {
    expect(completionBonus(1)).toBe(25);
    expect(completionBonus(4)).toBe(40);
  });

  it('caps the streak contribution at 10 days', () => {
    expect(completionBonus(10)).toBe(70);
    expect(completionBonus(11)).toBe(70);
    expect(completionBonus(365)).toBe(70);
  });
});

describe('levelFor', () => {
  it.each([
    [0, 1],
    [49, 1],
    [50, 2],
    [199, 2],
    [200, 3],
    [450, 4],
  ])('levelFor(%i) === %i', (xp, level) => {
    expect(levelFor(xp)).toBe(level);
  });

  it('treats negative XP as level 1', () => {
    expect(levelFor(-10)).toBe(1);
  });

  it('is consistent with xpAtLevel thresholds', () => {
    for (let level = 1; level <= 20; level++) {
      expect(levelFor(xpAtLevel(level))).toBe(level);
      if (level > 1) expect(levelFor(xpAtLevel(level) - 1)).toBe(level - 1);
    }
  });
});

describe('levelProgress', () => {
  it('starts at 0% of level 1', () => {
    expect(levelProgress(0)).toEqual({ level: 1, into: 0, needed: 50, pct: 0 });
  });

  it('reports partial progress within a level', () => {
    expect(levelProgress(25)).toEqual({ level: 1, into: 25, needed: 50, pct: 0.5 });
    expect(levelProgress(125)).toEqual({ level: 2, into: 75, needed: 150, pct: 0.5 });
  });

  it('resets to 0% exactly on a level-up', () => {
    expect(levelProgress(200)).toEqual({ level: 3, into: 0, needed: 250, pct: 0 });
  });
});
