export const XP = {
  perAttempt: 2,
  perCorrect: 10,
  setComplete: 20,
  perStreakDay: 5,
  streakCap: 10,
} as const;

export function xpForAnswer(correct: boolean): number {
  return XP.perAttempt + (correct ? XP.perCorrect : 0);
}

/** Bonus for finishing the daily set, given the streak AFTER completion. */
export function completionBonus(streak: number): number {
  return XP.setComplete + XP.perStreakDay * Math.min(streak, XP.streakCap);
}

/** level = floor(sqrt(xp / 50)) + 1 → L2 at 50 XP, L3 at 200, L4 at 450 … */
export function levelFor(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

/** Total XP needed to reach a level. */
export function xpAtLevel(level: number): number {
  return 50 * (level - 1) ** 2;
}

export function levelProgress(xp: number) {
  const level = levelFor(xp);
  const floor = xpAtLevel(level);
  const next = xpAtLevel(level + 1);
  return {
    level,
    into: xp - floor,
    needed: next - floor,
    pct: (xp - floor) / (next - floor),
  };
}
