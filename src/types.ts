export type Timbre = "piano" | "bell" | "synth";
export type Strictness = "lenient" | "standard" | "strict";
export type Reverb = "off" | "low" | "mid";
export type Grade = "S" | "A" | "B" | "C" | "D";
export type Judgment = "PERFECT" | "GREAT" | "GOOD" | "MISS";
export type GameMode = "follow" | "rhythm";
export type RecordSource = "free" | "follow" | "rhythm";

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  effectVolume: number;
  timbre: Timbre;
  reverb: Reverb;
  strictness: Strictness;
  calibration: number;
  haptics: boolean;
  reducedMotion: boolean;
  keyLabels: boolean;
}

export interface BestScore {
  bestScore: number;
  bestGrade: Grade | null;
  bestAccuracy: number;
  bestCombo: number;
  playCount: number;
  clearCount: number;
  lastPlayedAt: number;
}

export interface PerformanceStats {
  score: number;
  accuracy: number;
  maxCombo: number;
  grade: Grade;
  perfect: number;
  great: number;
  good: number;
  miss: number;
}

export interface PerformanceEvent {
  note: string;
  type: "down" | "up";
  time: number;
  velocity?: number;
  timbre?: Timbre;
}

export interface PerformanceRecord {
  id: string;
  title: string;
  createdAt: number;
  duration: number;
  timbre: Timbre;
  source: RecordSource;
  songId?: string;
  events: PerformanceEvent[];
  stats?: PerformanceStats;
}

export interface AchievementState {
  unlocked: Record<string, number>;
  whiteKeysPlayed: string[];
  blackKeyPlayed: boolean;
  completedSongIds: string[];
  bestComboEver: number;
  sGradeSongIds: string[];
}

export interface LevelProgress {
  stars: Record<string, number>;
  chapterUnlocked: number[];
  chapterRewardClaimed: number[];
  lastLevelId?: string;
}

export interface DailyState {
  date: string;
  songId: string;
  bestScore: number;
  bestGrade: Grade | null;
  bestAccuracy: number;
  attempts: number;
  completed: boolean;
  streak: number;
  lastCompletedDate: string;
}

export interface Profile {
  version: number;
  settings: Settings;
  bestScores: Record<string, BestScore>;
  records: PerformanceRecord[];
  achievements: AchievementState;
  levels: LevelProgress;
  daily: DailyState | null;
  firstRun: boolean;
  firstNotePlayed: boolean;
  firstSongCompleted: boolean;
  lastSongId?: string;
}

export interface SongNote {
  notes: string[];
  time: number;
  duration: number;
  velocity?: number;
}

export interface Song {
  id: string;
  title: string;
  titleEn?: string;
  category: "入门" | "初级" | "中级" | "和弦";
  difficulty: number;
  bpm: number;
  timeSignature: string;
  duration: number;
  notes: SongNote[];
  focusKeys?: string[];
  cover: string;
  tags: string[];
}
