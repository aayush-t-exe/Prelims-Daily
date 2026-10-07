import type { Question, Subject } from '../data/questions';
import { daysBetween } from './date';

export type SubjectStats = Partial<Record<Subject, { attempts: number; correct: number }>>;

/** String → 32-bit seed (FNV-1a). Same date string always gives the same seed. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Tiny deterministic PRNG (mulberry32). Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle driven by a seeded RNG; does not mutate the input. */
export function seededShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const MIN_ATTEMPTS_FOR_WEAK = 3;

/** The (up to) 2 subjects with the lowest accuracy, among subjects with enough attempts. */
export function weakSubjects(stats: SubjectStats, limit = 2): Subject[] {
  return (Object.entries(stats) as [Subject, { attempts: number; correct: number }][])
    .filter(([, s]) => s.attempts >= MIN_ATTEMPTS_FOR_WEAK)
    .map(([subject, s]) => ({ subject, acc: s.correct / s.attempts }))
    .filter((x) => x.acc < 1)
    .sort((a, b) => a.acc - b.acc || a.subject.localeCompare(b.subject))
    .slice(0, limit)
    .map((x) => x.subject);
}

export interface DailySetInput {
  questions: readonly Question[];
  /** Seed string, normally the local date ('2026-10-07'); extra practice rounds append a suffix. */
  seed: string;
  today: string;
  count: number;
  stats: SubjectStats;
  /** questionId → local date it was last answered. */
  lastSeen: Record<string, string>;
  /** Ids that must not appear (e.g. already in today's earlier round). */
  exclude?: readonly string[];
  recentDays?: number;
}

/**
 * Builds the day's question ids.
 * - Deterministic for the same seed + inputs (so a reinstall mid-day shows the same set).
 * - About half the picks come from the 2 weakest subjects once there's enough data.
 * - Skips questions seen in the last `recentDays` days when there are enough others.
 */
export function buildDailySet({
  questions,
  seed,
  today,
  count,
  stats,
  lastSeen,
  exclude = [],
  recentDays = 3,
}: DailySetInput): string[] {
  const rng = mulberry32(hashString(seed));
  const n = Math.min(count, questions.length);
  const excluded = new Set(exclude);

  const isRecent = (q: Question) => {
    const seen = lastSeen[q.id];
    return seen !== undefined && daysBetween(seen, today) <= recentDays;
  };

  // Fresh questions first, then recent ones, then excluded ones as a last resort.
  const fresh = seededShuffle(questions.filter((q) => !excluded.has(q.id) && !isRecent(q)), rng);
  const recent = seededShuffle(questions.filter((q) => !excluded.has(q.id) && isRecent(q)), rng);
  const rest = seededShuffle(questions.filter((q) => excluded.has(q.id)), rng);
  const ordered = [...fresh, ...recent, ...rest];

  const weak = new Set(weakSubjects(stats));
  const picked: Question[] = [];
  const take = (pred: (q: Question) => boolean, limit: number) => {
    for (const q of ordered) {
      if (picked.length >= limit) return;
      if (!picked.includes(q) && pred(q)) picked.push(q);
    }
  };

  if (weak.size > 0) {
    // Weak picks only come from the fresh pool, so weighting never forces repeats.
    const freshWeak = fresh.filter((q) => weak.has(q.subject));
    for (const q of freshWeak.slice(0, Math.round(n / 2))) picked.push(q);
    take((q) => !weak.has(q.subject), n);
  }
  take(() => true, n);

  // Shuffle the final order so weak-subject questions aren't bunched at the start.
  return seededShuffle(picked, rng).map((q) => q.id);
}
