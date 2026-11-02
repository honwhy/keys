import { SONGS } from "../songs/data";
import type { Profile } from "../types";

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "入门" | "进阶" | "大师";
  target: number;
  progress: (profile: Profile) => number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "A01",
    name: "第一个音",
    icon: "🎵",
    description: "第一次按下任意琴键",
    category: "入门",
    target: 1,
    progress: (profile) => (profile.firstNotePlayed ? 1 : 0),
  },
  {
    id: "A02",
    name: "初学者",
    icon: "⭐",
    description: "完成第一首曲目",
    category: "入门",
    target: 1,
    progress: (profile) => (profile.firstSongCompleted ? 1 : 0),
  },
  {
    id: "A03",
    name: "连击达人",
    icon: "🔥",
    description: "单局达到 50 Combo",
    category: "进阶",
    target: 50,
    progress: (profile) => profile.achievements.bestComboEver,
  },
  {
    id: "A04",
    name: "八度大师",
    icon: "🎹",
    description: "按下全部 10 个白键",
    category: "进阶",
    target: 10,
    progress: (profile) => profile.achievements.whiteKeysPlayed.length,
  },
  {
    id: "A05",
    name: "黑键入门",
    icon: "♯",
    description: "第一次按下黑键",
    category: "入门",
    target: 1,
    progress: (profile) => (profile.achievements.blackKeyPlayed ? 1 : 0),
  },
  {
    id: "A06",
    name: "和弦大师",
    icon: "🎼",
    description: "第一次识别三和弦",
    category: "进阶",
    target: 1,
    progress: (profile) => (profile.achievements.unlocked.A06 ? 1 : 0),
  },
  {
    id: "A07",
    name: "完美演奏",
    icon: "🏆",
    description: "一首曲目准确率 100%",
    category: "大师",
    target: 1,
    progress: (profile) => Object.values(profile.bestScores).some((score) => score.bestAccuracy >= 1) ? 1 : 0,
  },
  {
    id: "A08",
    name: "我的作品",
    icon: "🎙",
    description: "保存第一条演奏记录",
    category: "入门",
    target: 1,
    progress: (profile) => Math.min(1, profile.records.length),
  },
  {
    id: "A09",
    name: "演奏家",
    icon: "🎵",
    description: "完成 10 首不同曲目",
    category: "大师",
    target: 10,
    progress: (profile) => profile.achievements.completedSongIds.length,
  },
  {
    id: "A10",
    name: "钢琴大师",
    icon: "👑",
    description: "全部曲目达到 S 评级",
    category: "大师",
    target: SONGS.length,
    progress: (profile) => profile.achievements.sGradeSongIds.length,
  },
];

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}

export function unlockAchievement(profile: Profile, id: string): boolean {
  if (profile.achievements.unlocked[id]) {
    return false;
  }
  profile.achievements.unlocked[id] = Date.now();
  return true;
}

export function checkAchievements(profile: Profile): AchievementDef[] {
  const unlocked: AchievementDef[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (profile.achievements.unlocked[achievement.id]) {
      continue;
    }
    if (achievement.progress(profile) >= achievement.target) {
      profile.achievements.unlocked[achievement.id] = Date.now();
      unlocked.push(achievement);
    }
  }
  return unlocked;
}

export function recordNoteForAchievements(profile: Profile, note: string): AchievementDef[] {
  if (!profile.firstNotePlayed) {
    profile.firstNotePlayed = true;
    profile.firstRun = false;
  }
  if (note.includes("#")) {
    profile.achievements.blackKeyPlayed = true;
  } else {
    if (!profile.achievements.whiteKeysPlayed.includes(note)) {
      profile.achievements.whiteKeysPlayed.push(note);
    }
  }
  return checkAchievements(profile);
}
