import { SONGS } from "../songs/data";
import type { DailyState, Profile } from "../types";

export function todayKey(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function yesterdayKey(date = new Date()): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return todayKey(yesterday);
}

function hashDate(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function dailySongId(_profile: Profile, date = todayKey()): string {
  const unlocked = SONGS;
  if (unlocked.length === 0) return "twinkle";
  return unlocked[hashDate(date) % unlocked.length]?.id ?? "twinkle";
}

export function ensureDaily(profile: Profile): { daily: DailyState; changed: boolean } {
  const date = todayKey();
  if (profile.daily && profile.daily.date === date) {
    return { daily: profile.daily, changed: false };
  }
  const daily: DailyState = {
    date,
    songId: dailySongId(profile, date),
    bestScore: 0,
    bestGrade: null,
    bestAccuracy: 0,
    attempts: 0,
    completed: false,
    streak: profile.daily?.streak ?? 0,
    lastCompletedDate: profile.daily?.lastCompletedDate ?? "",
  };
  profile.daily = daily;
  return { daily, changed: true };
}

export function updateDailyWithResult(
  profile: Profile,
  date: string,
  score: number,
  grade: DailyState["bestGrade"],
  accuracy: number,
): void {
  const daily = profile.daily;
  if (!daily || daily.date !== date) {
    return;
  }
  daily.attempts += 1;
  if (!daily.completed) {
    daily.completed = true;
    const yesterday = yesterdayKey(new Date());
    daily.streak = daily.lastCompletedDate === yesterday ? daily.streak + 1 : 1;
    daily.lastCompletedDate = date;
  }
  if (score > daily.bestScore) {
    daily.bestScore = score;
  }
  const order = { D: 1, C: 2, B: 3, A: 4, S: 5 } as const;
  if (!daily.bestGrade || (grade && order[grade] > order[daily.bestGrade])) {
    daily.bestGrade = grade;
  }
  if (accuracy > daily.bestAccuracy) {
    daily.bestAccuracy = accuracy;
  }
}
