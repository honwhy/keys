import type { GameMode, Grade, Profile } from "../types";

export interface LevelDef {
  id: string;
  chapter: number;
  title: string;
  mode: GameMode;
  songId: string;
  description: string;
}

export interface ChapterDef {
  id: number;
  title: string;
  subtitle: string;
  levels: LevelDef[];
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 1,
    title: "认识音符",
    subtitle: "三个白键起步",
    levels: [
      { id: "1-1", chapter: 1, title: "找到 C", mode: "follow", songId: "cde-etude", description: "按对 C，找到琴键位置" },
      { id: "1-2", chapter: 1, title: "C 与 D", mode: "follow", songId: "cde-etude", description: "两个键的来回" },
      { id: "1-3", chapter: 1, title: "C-D-E", mode: "follow", songId: "cde-etude", description: "三个键的小练习" },
      { id: "1-4", chapter: 1, title: "小星星", mode: "follow", songId: "twinkle", description: "第一首完整旋律" },
    ],
  },
  {
    id: 2,
    title: "完整八度",
    subtitle: "七个白键",
    levels: [
      { id: "2-1", chapter: 2, title: "两只老虎", mode: "follow", songId: "two-tigers", description: "级进与跳进" },
      { id: "2-2", chapter: 2, title: "欢乐颂", mode: "rhythm", songId: "ode-to-joy", description: "完整七声音阶" },
      { id: "2-3", chapter: 2, title: "生日快乐", mode: "rhythm", songId: "birthday", description: "附点节奏" },
    ],
  },
  {
    id: 3,
    title: "黑键来了",
    subtitle: "五个黑键",
    levels: [
      { id: "3-1", chapter: 3, title: "黑键初见", mode: "follow", songId: "practice-black-1", description: "C# 与 D#" },
      { id: "3-2", chapter: 3, title: "黑键五兄弟", mode: "follow", songId: "practice-black-2", description: "五个黑键都按到" },
      { id: "3-3", chapter: 3, title: "黑键小曲", mode: "rhythm", songId: "practice-black-2", description: "黑键节奏挑战" },
    ],
  },
  {
    id: 4,
    title: "和弦色彩",
    subtitle: "双音与三和弦",
    levels: [
      { id: "4-1", chapter: 4, title: "C 大三和弦", mode: "follow", songId: "practice-c-major", description: "C-E-G 的分解" },
      { id: "4-2", chapter: 4, title: "F 与 G", mode: "follow", songId: "practice-f-g", description: "F 与 G 和弦" },
      { id: "4-3", chapter: 4, title: "和弦进行", mode: "rhythm", songId: "practice-f-g", description: "和弦连接" },
    ],
  },
];

export const ALL_LEVELS = CHAPTERS.flatMap((chapter) => chapter.levels);

export function levelById(id: string): LevelDef | undefined {
  return ALL_LEVELS.find((level) => level.id === id);
}

export function starsForGrade(grade: Grade): number {
  if (grade === "S" || grade === "A") return 3;
  if (grade === "B") return 2;
  return 1;
}

export function isChapterUnlocked(profile: Profile, chapterId: number): boolean {
  if (chapterId === 1) return true;
  const previous = CHAPTERS.find((chapter) => chapter.id === chapterId - 1);
  if (!previous) return false;
  return previous.levels.every((level) => (profile.levels.stars[level.id] ?? 0) >= 1);
}

export function isLevelUnlocked(profile: Profile, level: LevelDef): boolean {
  if (!isChapterUnlocked(profile, level.chapter)) return false;
  const chapter = CHAPTERS.find((item) => item.id === level.chapter);
  if (!chapter) return false;
  const index = chapter.levels.findIndex((item) => item.id === level.id);
  if (index <= 0) return true;
  const previous = chapter.levels[index - 1];
  return (profile.levels.stars[previous?.id ?? ""] ?? 0) >= 1;
}

export function updateLevelStars(profile: Profile, levelId: string, grade: Grade): number {
  const earned = starsForGrade(grade);
  const previous = profile.levels.stars[levelId] ?? 0;
  profile.levels.stars[levelId] = Math.max(previous, earned);
  profile.levels.lastLevelId = levelId;
  return profile.levels.stars[levelId];
}
