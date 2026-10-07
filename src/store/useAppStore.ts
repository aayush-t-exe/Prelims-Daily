import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getQuestion, QUESTIONS, type Subject } from '../data/questions';
import { buildDailySet, type SubjectStats } from '../logic/dailySet';
import { localDate } from '../logic/date';
import { applyCompletion, initialStreak, type StreakState } from '../logic/streak';
import { completionBonus, xpForAnswer } from '../logic/xp';

export interface Profile {
  name: string;
  targetYear: number;
  dailyTarget: number;
  reminderHour: number;
  reminderMinute: number;
  remindersOn: boolean;
}

export interface Progress {
  date: string;
  /** 0 = the daily set; 1+ = optional "practise more" rounds after it's done. */
  round: number;
  setIds: string[];
  /** questionId → chosen option index */
  answers: Record<string, number>;
  completed: boolean;
  /** every id served today, so extra rounds don't repeat them */
  servedToday: string[];
}

export interface SetResult {
  date: string;
  round: number;
  correct: number;
  total: number;
  xpEarned: number;
  streakBefore: number;
  streakAfter: number;
  streakCounted: boolean;
  usedFreeze: boolean;
  earnedFreeze: boolean;
}

interface Data {
  profile: Profile | null;
  progress: Progress | null;
  streak: StreakState;
  xp: number;
  stats: SubjectStats;
  /** questionId → local date last answered */
  lastSeen: Record<string, string>;
  bookmarks: string[];
  mistakes: string[];
  lastResult: SetResult | null;
}

interface Actions {
  completeOnboarding: (p: Profile) => void;
  updateProfile: (p: Partial<Profile>) => void;
  /** Make sure `progress` is today's set; creates it if the day changed. */
  ensureTodaySet: () => Progress;
  answer: (id: string, choice: number) => { correct: boolean; xp: number } | null;
  completeSet: () => SetResult | null;
  startPracticeRound: () => void;
  toggleBookmark: (id: string) => void;
  resetProgress: () => void;
}

export type AppState = Data & Actions;

const defaults: Data = {
  profile: null,
  progress: null,
  streak: initialStreak,
  xp: 0,
  stats: {},
  lastSeen: {},
  bookmarks: [],
  mistakes: [],
  lastResult: null,
};

export const STORE_VERSION = 1;

function newSet(s: Data, today: string, round: number, servedToday: string[]): Progress {
  const setIds = buildDailySet({
    questions: QUESTIONS,
    seed: round === 0 ? today : `${today}#${round}`,
    today,
    count: s.profile?.dailyTarget ?? 10,
    stats: s.stats,
    lastSeen: s.lastSeen,
    exclude: servedToday,
  });
  return {
    date: today,
    round,
    setIds,
    answers: {},
    completed: false,
    servedToday: [...new Set([...servedToday, ...setIds])],
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isIdList = (v: unknown): v is string[] => Array.isArray(v) && v.every((id) => typeof id === 'string');

/** A saved set is only resumable if every part is intact and every question still exists. */
function validProgress(v: unknown): v is Progress {
  return (
    isObj(v) &&
    typeof v.date === 'string' &&
    typeof v.round === 'number' &&
    typeof v.completed === 'boolean' &&
    isObj(v.answers) &&
    isIdList(v.servedToday) &&
    isIdList(v.setIds) &&
    v.setIds.length > 0 &&
    v.setIds.every((id) => getQuestion(id))
  );
}

/**
 * Defensive check of what came out of storage. Core fields malformed → defaults;
 * secondary fields malformed → just that field resets. Never a crash, never a soft-lock.
 */
export function sanitize(persisted: unknown): Data {
  if (!isObj(persisted)) return defaults;
  const p = persisted as Partial<Data>;
  const ok =
    (p.profile === null || isObj(p.profile)) &&
    isObj(p.streak) &&
    typeof p.streak.current === 'number' &&
    typeof p.xp === 'number';
  if (!ok) return defaults;
  return {
    ...defaults,
    profile: p.profile ?? null,
    xp: p.xp!,
    streak: { ...initialStreak, ...p.streak!, history: isObj(p.streak!.history) ? p.streak!.history : {} },
    progress: validProgress(p.progress) ? p.progress : null,
    stats: isObj(p.stats) ? p.stats : {},
    lastSeen: isObj(p.lastSeen) ? (p.lastSeen as Record<string, string>) : {},
    // Drop ids that no longer exist in the question bank.
    bookmarks: isIdList(p.bookmarks) ? p.bookmarks.filter((id) => getQuestion(id)) : [],
    mistakes: isIdList(p.mistakes) ? p.mistakes.filter((id) => getQuestion(id)) : [],
    lastResult: isObj(p.lastResult) ? (p.lastResult as unknown as SetResult) : null,
  };
}

/**
 * AsyncStorage wrapped so a failed read or corrupt JSON behaves like "nothing saved".
 * Otherwise zustand's hydration rejects, never finishes, and the app sits on the splash.
 */
const safeStorage = createJSONStorage<Data>(() => ({
  getItem: async (key) => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return null;
      JSON.parse(raw); // validate here, so a parse error can't escape into zustand
      return raw;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => AsyncStorage.setItem(key, value).catch(() => {}),
  removeItem: (key) => AsyncStorage.removeItem(key).catch(() => {}),
}));

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...defaults,

      completeOnboarding: (profile) => set({ profile }),

      updateProfile: (patch) => {
        const s = get();
        if (!s.profile) return;
        const profile = { ...s.profile, ...patch };
        let progress = s.progress;
        // A new daily target applies right away if today's set hasn't been started.
        if (
          patch.dailyTarget !== undefined &&
          progress &&
          !progress.completed &&
          Object.keys(progress.answers).length === 0
        ) {
          progress = newSet({ ...s, profile }, progress.date, progress.round, progress.servedToday.filter((id) => !progress!.setIds.includes(id)));
        }
        set({ profile, progress });
      },

      ensureTodaySet: () => {
        const s = get();
        const today = localDate();
        if (s.progress && s.progress.date === today) return s.progress;
        const progress = newSet(s, today, 0, []);
        set({ progress });
        return progress;
      },

      answer: (id, choice) => {
        const s = get();
        const q = getQuestion(id);
        if (!q || !s.progress || id in s.progress.answers) return null;
        const correct = choice === q.answerIndex;
        const gained = xpForAnswer(correct);
        const prev = s.stats[q.subject] ?? { attempts: 0, correct: 0 };
        set({
          progress: { ...s.progress, answers: { ...s.progress.answers, [id]: choice } },
          xp: s.xp + gained,
          stats: {
            ...s.stats,
            [q.subject]: { attempts: prev.attempts + 1, correct: prev.correct + (correct ? 1 : 0) },
          },
          lastSeen: { ...s.lastSeen, [id]: s.progress.date },
          // Getting it right later clears it from Mistakes; getting it wrong adds it.
          mistakes: correct
            ? s.mistakes.filter((m) => m !== id)
            : [id, ...s.mistakes.filter((m) => m !== id)],
        });
        return { correct, xp: gained };
      },

      completeSet: () => {
        const s = get();
        const p = s.progress;
        if (!p || p.setIds.some((id) => !(id in p.answers))) return null;
        if (p.completed) return s.lastResult;

        const correct = p.setIds.filter((id) => getQuestion(id)?.answerIndex === p.answers[id]).length;
        const answerXp = p.setIds.reduce(
          (sum, id) => sum + xpForAnswer(getQuestion(id)?.answerIndex === p.answers[id]),
          0,
        );

        // Only the first round of the day counts toward the streak.
        const c = p.round === 0 ? applyCompletion(s.streak, p.date) : null;
        const bonus = c?.counted ? completionBonus(c.state.current) : 0;

        const result: SetResult = {
          date: p.date,
          round: p.round,
          correct,
          total: p.setIds.length,
          xpEarned: answerXp + bonus,
          streakBefore: c?.before ?? s.streak.current,
          streakAfter: c?.state.current ?? s.streak.current,
          streakCounted: !!c?.counted,
          usedFreeze: !!c?.usedFreeze,
          earnedFreeze: !!c?.earnedFreeze,
        };
        set({
          progress: { ...p, completed: true },
          streak: c?.state ?? s.streak,
          xp: s.xp + bonus,
          lastResult: result,
        });
        return result;
      },

      startPracticeRound: () => {
        const s = get();
        const p = s.progress;
        if (!p || !p.completed) return;
        set({ progress: newSet(s, p.date, p.round + 1, p.servedToday) });
      },

      toggleBookmark: (id) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(id)
            ? s.bookmarks.filter((b) => b !== id)
            : [id, ...s.bookmarks],
        })),

      // Keeps the profile (name, settings) and wipes everything else.
      resetProgress: () => set((s) => ({ ...defaults, profile: s.profile })),
    }),
    {
      name: 'prelims-daily',
      version: STORE_VERSION,
      storage: safeStorage,
      partialize: (s) => {
        const { profile, progress, streak, xp, stats, lastSeen, bookmarks, mistakes, lastResult } = s;
        return { profile, progress, streak, xp, stats, lastSeen, bookmarks, mistakes, lastResult };
      },
      // Future schema changes go here (e.g. `if (version < 2) …`). Unknown → safe defaults.
      migrate: (persisted, version) => (version === STORE_VERSION ? sanitize(persisted) : defaults),
      merge: (persisted, current) => {
        try {
          return { ...current, ...sanitize(persisted) };
        } catch {
          return { ...current, ...defaults };
        }
      },
    },
  ),
);

/** Helper for screens: weak/strong subject stats with accuracy. */
export function subjectAccuracy(stats: SubjectStats, subject: Subject) {
  const s = stats[subject];
  return s && s.attempts > 0 ? s.correct / s.attempts : null;
}
