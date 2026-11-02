import type { Profile, Settings } from "../types";

export const PROFILE_KEY = "keytune.profile.v1";
export const PROFILE_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 80,
  musicVolume: 70,
  effectVolume: 80,
  timbre: "piano",
  reverb: "low",
  strictness: "standard",
  calibration: 0,
  haptics: true,
  reducedMotion: false,
  keyLabels: true,
};

export function createDefaultProfile(): Profile {
  return {
    version: PROFILE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    bestScores: {},
    records: [],
    achievements: {
      unlocked: {},
      whiteKeysPlayed: [],
      blackKeyPlayed: false,
      completedSongIds: [],
      bestComboEver: 0,
      sGradeSongIds: [],
    },
    levels: {
      stars: {},
      chapterUnlocked: [1],
      chapterRewardClaimed: [],
    },
    daily: null,
    firstRun: true,
    firstNotePlayed: false,
    firstSongCompleted: false,
  };
}

function clampVolume(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(100, Math.max(0, Math.round(number / 5) * 5));
}

export function normalizeSettings(raw: unknown): Settings {
  const value = (raw ?? {}) as Partial<Settings>;
  const timbres = new Set(["piano", "bell", "synth"]);
  const reverbs = new Set(["off", "low", "mid"]);
  const strictness = new Set(["lenient", "standard", "strict"]);

  return {
    masterVolume: clampVolume(value.masterVolume, DEFAULT_SETTINGS.masterVolume),
    musicVolume: clampVolume(value.musicVolume, DEFAULT_SETTINGS.musicVolume),
    effectVolume: clampVolume(value.effectVolume, DEFAULT_SETTINGS.effectVolume),
    timbre: timbres.has(String(value.timbre)) ? (value.timbre as Settings["timbre"]) : DEFAULT_SETTINGS.timbre,
    reverb: reverbs.has(String(value.reverb)) ? (value.reverb as Settings["reverb"]) : DEFAULT_SETTINGS.reverb,
    strictness: strictness.has(String(value.strictness))
      ? (value.strictness as Settings["strictness"])
      : DEFAULT_SETTINGS.strictness,
    calibration: Math.min(200, Math.max(-200, Math.round(Number(value.calibration ?? 0) / 10) * 10)),
    haptics: value.haptics !== false,
    reducedMotion: value.reducedMotion === true,
    keyLabels: value.keyLabels !== false,
  };
}

export function normalizeProfile(raw: unknown): Profile {
  const defaults = createDefaultProfile();
  const value = (raw ?? {}) as Partial<Profile>;

  return {
    ...defaults,
    ...value,
    version: PROFILE_VERSION,
    settings: normalizeSettings(value.settings),
    bestScores: value.bestScores ?? {},
    records: Array.isArray(value.records) ? value.records : [],
    achievements: {
      ...defaults.achievements,
      ...(value.achievements ?? {}),
      unlocked: value.achievements?.unlocked ?? {},
      whiteKeysPlayed: Array.isArray(value.achievements?.whiteKeysPlayed)
        ? value.achievements?.whiteKeysPlayed
        : [],
      completedSongIds: Array.isArray(value.achievements?.completedSongIds)
        ? value.achievements?.completedSongIds
        : [],
      sGradeSongIds: Array.isArray(value.achievements?.sGradeSongIds)
        ? value.achievements?.sGradeSongIds
        : [],
    },
    levels: {
      ...defaults.levels,
      ...(value.levels ?? {}),
      stars: value.levels?.stars ?? {},
      chapterUnlocked: Array.isArray(value.levels?.chapterUnlocked) && value.levels.chapterUnlocked.length > 0
        ? value.levels.chapterUnlocked
        : [1],
      chapterRewardClaimed: Array.isArray(value.levels?.chapterRewardClaimed)
        ? value.levels.chapterRewardClaimed
        : [],
    },
    daily: value.daily ?? null,
    firstRun: value.firstRun !== false,
    firstNotePlayed: value.firstNotePlayed === true,
    firstSongCompleted: value.firstSongCompleted === true,
  };
}

export interface LoadProfileResult {
  profile: Profile;
  warning: string | null;
}

export function loadProfile(): LoadProfileResult {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return { profile: createDefaultProfile(), warning: null };
    }
    return { profile: normalizeProfile(JSON.parse(raw)), warning: null };
  } catch (error) {
    console.warn("Profile load failed", error);
    return {
      profile: createDefaultProfile(),
      warning: "本地数据读取失败，已使用默认设置。",
    };
  }
}

export function saveProfile(profile: Profile): boolean {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch (error) {
    console.warn("Profile save failed", error);
    return false;
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch (error) {
    console.warn("Profile clear failed", error);
  }
}

export function profileSizeBytes(profile: Profile): number {
  try {
    return new Blob([JSON.stringify(profile)]).size;
  } catch {
    return 0;
  }
}

export function markFirstNote(profile: Profile): void {
  profile.firstNotePlayed = true;
  profile.firstRun = false;
}

export function clearPerformanceData(profile: Profile): void {
  profile.bestScores = {};
  profile.records = [];
  profile.achievements = createDefaultProfile().achievements;
  profile.levels = createDefaultProfile().levels;
  profile.daily = null;
  profile.firstSongCompleted = false;
  profile.lastSongId = undefined;
}
