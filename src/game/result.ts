import type { RecordingDraft } from "../recorder/recorder";
import { ensureDaily, updateDailyWithResult } from "../daily/daily";
import { updateLevelStars } from "../levels/data";
import type { GameMode, Grade, Profile, RecordSource } from "../types";
import type { SessionSummary } from "./judge";

export interface GameResult {
  mode: GameMode;
  source: RecordSource;
  songId: string;
  title: string;
  summary: SessionSummary;
  completedAt: number;
  record?: RecordingDraft;
  dailyDate?: string;
  levelId?: string;
  applied?: boolean;
}

const KEY = "keytune.pending-result";

let pending: GameResult | null = null;

export function setPendingResult(result: GameResult): void {
  pending = result;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(result));
  } catch {
    // In-memory fallback is enough for the current tab.
  }
}

export function getPendingResult(): GameResult | null {
  if (pending) {
    return pending;
  }
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      pending = JSON.parse(raw) as GameResult;
    }
  } catch {
    pending = null;
  }
  return pending;
}

export function clearPendingResult(): void {
  pending = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Ignore storage errors.
  }
}

export interface RecordOutcome {
  newScore: boolean;
  newGrade: boolean;
  newAccuracy: boolean;
  newCombo: boolean;
  firstClear: boolean;
}

const GRADE_ORDER: Record<Grade, number> = { D: 1, C: 2, B: 3, A: 4, S: 5 };

export function applyResult(profile: Profile, result: GameResult): RecordOutcome {
  if (result.applied) {
    return { newScore: false, newGrade: false, newAccuracy: false, newCombo: false, firstClear: false };
  }
  result.applied = true;

  const key = `${result.songId}:${result.mode}`;
  const previous = profile.bestScores[key];
  const firstClear = !profile.firstSongCompleted;
  const newScore = result.summary.score > (previous?.bestScore ?? -1);
  const newGrade =
    previous?.bestGrade == null ||
    GRADE_ORDER[result.summary.grade] > GRADE_ORDER[previous.bestGrade];
  const newAccuracy = result.summary.accuracy > (previous?.bestAccuracy ?? -1);
  const newCombo = result.summary.maxCombo > (previous?.bestCombo ?? -1);

  profile.bestScores[key] = {
    bestScore: Math.max(previous?.bestScore ?? 0, result.summary.score),
    bestGrade: newGrade ? result.summary.grade : previous?.bestGrade ?? result.summary.grade,
    bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, result.summary.accuracy),
    bestCombo: Math.max(previous?.bestCombo ?? 0, result.summary.maxCombo),
    playCount: (previous?.playCount ?? 0) + 1,
    clearCount: (previous?.clearCount ?? 0) + 1,
    lastPlayedAt: result.completedAt,
  };
  profile.lastSongId = result.songId;
  profile.firstSongCompleted = true;
  profile.firstRun = false;

  if (result.summary.grade === "S" && !profile.achievements.sGradeSongIds.includes(result.songId)) {
    profile.achievements.sGradeSongIds.push(result.songId);
  }
  if (result.summary.maxCombo > profile.achievements.bestComboEver) {
    profile.achievements.bestComboEver = result.summary.maxCombo;
  }
  if (!profile.achievements.completedSongIds.includes(result.songId)) {
    profile.achievements.completedSongIds.push(result.songId);
  }
  if (result.dailyDate) {
    ensureDaily(profile);
    updateDailyWithResult(
      profile,
      result.dailyDate,
      result.summary.score,
      result.summary.grade,
      result.summary.accuracy,
    );
  }
  if (result.levelId) {
    updateLevelStars(profile, result.levelId, result.summary.grade);
  }

  return { newScore, newGrade, newAccuracy, newCombo, firstClear };
}
