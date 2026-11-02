import type { Song } from "../types";

type Step = [string | string[], number];

function makeSong(
  meta: Omit<Song, "notes" | "duration" | "focusKeys" | "timeSignature" | "tags"> & { tags?: string[] },
  steps: Step[],
): Song {
  const beat = 60000 / meta.bpm;
  let time = 0;
  const notes = steps.map(([pitch, beats]) => {
    const note = {
      notes: Array.isArray(pitch) ? pitch : [pitch],
      time: Math.round(time),
      duration: Math.round(beats * beat * 0.84),
    };
    time += beats * beat;
    return note;
  });
  const focusKeys = [...new Set(notes.flatMap((note) => note.notes))];

  return {
    ...meta,
    timeSignature: "4/4",
    duration: Math.round(time + 2000),
    notes,
    focusKeys,
    tags: meta.tags ?? [],
  };
}

export const SONGS: Song[] = [
  makeSong(
    {
      id: "cde-etude",
      title: "C-D-E 练习曲",
      titleEn: "C-D-E Etude",
      category: "入门",
      difficulty: 1,
      bpm: 60,
      cover: "cde-etude",
      tags: ["练习", "3 键"],
    },
    [
      ["C4", 1.5],
      ["D4", 1.5],
      ["E4", 1.5],
      ["C4", 1.5],
      ["D4", 1.5],
      ["E4", 1.5],
      ["F4", 1.5],
      ["E4", 1.5],
      ["D4", 1.5],
      ["C4", 1.5],
      ["D4", 1.5],
      ["E4", 1.5],
    ],
  ),
  makeSong(
    {
      id: "twinkle",
      title: "小星星",
      titleEn: "Twinkle Twinkle Little Star",
      category: "入门",
      difficulty: 2,
      bpm: 100,
      cover: "twinkle",
      tags: ["儿歌", "入门"],
    },
    [
      ["C4", 1], ["C4", 1], ["G4", 1], ["G4", 1], ["A4", 1], ["A4", 1], ["G4", 2],
      ["F4", 1], ["F4", 1], ["E4", 1], ["E4", 1], ["D4", 1], ["D4", 1], ["C4", 2],
      ["G4", 1], ["G4", 1], ["F4", 1], ["F4", 1], ["E4", 1], ["E4", 1], ["D4", 2],
      ["G4", 1], ["G4", 1], ["F4", 1], ["F4", 1], ["E4", 1], ["E4", 1], ["D4", 2],
      ["C4", 1], ["C4", 1], ["G4", 1], ["G4", 1], ["A4", 1], ["A4", 1], ["G4", 2],
      ["F4", 1], ["F4", 1], ["E4", 1], ["E4", 1], ["D4", 1], ["D4", 1], ["C4", 2],
    ],
  ),
  makeSong(
    {
      id: "two-tigers",
      title: "两只老虎",
      titleEn: "Two Tigers",
      category: "入门",
      difficulty: 2,
      bpm: 110,
      cover: "two-tigers",
      tags: ["儿歌", "重复"],
    },
    [
      ["C4", 1.5], ["D4", 1.5], ["E4", 1.5], ["C4", 1.5],
      ["C4", 1.5], ["D4", 1.5], ["E4", 1.5], ["C4", 1.5],
      ["E4", 1.5], ["F4", 1.5], ["G4", 3],
      ["E4", 1.5], ["F4", 1.5], ["G4", 3],
      ["G4", 1], ["A4", 1], ["G4", 1], ["F4", 1], ["E4", 1.5], ["C4", 1.5],
      ["G4", 1], ["A4", 1], ["G4", 1], ["F4", 1], ["E4", 1.5], ["C4", 1.5],
      ["C4", 1.5], ["G4", 1.5], ["C4", 3],
      ["C4", 1.5], ["G4", 1.5], ["C4", 3],
    ],
  ),
  makeSong(
    {
      id: "ode-to-joy",
      title: "欢乐颂（简化）",
      titleEn: "Ode to Joy",
      category: "初级",
      difficulty: 3,
      bpm: 100,
      cover: "ode-to-joy",
      tags: ["古典", "七声音阶"],
    },
    [
      ["E4", 1.2], ["E4", 1.2], ["F4", 1.2], ["G4", 1.2],
      ["G4", 1.2], ["F4", 1.2], ["E4", 1.2], ["D4", 1.2],
      ["C4", 1.2], ["C4", 1.2], ["D4", 1.2], ["E4", 1.2],
      ["E4", 1.8], ["D4", 0.8], ["D4", 2.4],
      ["E4", 1.2], ["E4", 1.2], ["F4", 1.2], ["G4", 1.2],
      ["G4", 1.2], ["F4", 1.2], ["E4", 1.2], ["D4", 1.2],
      ["C4", 1.2], ["C4", 1.2], ["D4", 1.2], ["E4", 1.2],
      ["D4", 1.8], ["C4", 0.8], ["C4", 2.4],
    ],
  ),
  makeSong(
    {
      id: "birthday",
      title: "生日快乐",
      titleEn: "Happy Birthday",
      category: "初级",
      difficulty: 3,
      bpm: 90,
      cover: "birthday",
      tags: ["节日", "附点"],
    },
    [
      ["G4", 1], ["G4", 0.5], ["A4", 1.5], ["G4", 1.5], ["C5", 1.5], ["B4", 3],
      ["G4", 1], ["G4", 0.5], ["A4", 1.5], ["G4", 1.5], ["D5", 1.5], ["C5", 3],
      ["G4", 1], ["G4", 0.5], ["G4", 1.5], ["E4", 1.5], ["C5", 1.5], ["B4", 1.5], ["A4", 3],
      ["F4", 1], ["F4", 0.5], ["E4", 1.5], ["C5", 1.5], ["D5", 1.5], ["C5", 3],
    ],
  ),
  makeSong(
    {
      id: "jingle-bells",
      title: "铃儿响叮当（简化）",
      titleEn: "Jingle Bells",
      category: "初级",
      difficulty: 3,
      bpm: 120,
      cover: "jingle-bells",
      tags: ["节日", "稍快"],
    },
    [
      ["E4", 1], ["E4", 1], ["E4", 2],
      ["E4", 1], ["E4", 1], ["E4", 2],
      ["E4", 1], ["G4", 1], ["C4", 1.5], ["D4", 0.5], ["E4", 3],
      ["F4", 1], ["F4", 1], ["F4", 1], ["F4", 1],
      ["F4", 1], ["E4", 1], ["E4", 1], ["E4", 0.5], ["E4", 0.5],
      ["E4", 1], ["D4", 1], ["D4", 1], ["E4", 1],
      ["D4", 2], ["G4", 2],
      ["E4", 1], ["E4", 1], ["E4", 2],
      ["E4", 1], ["E4", 1], ["E4", 2],
      ["E4", 1], ["G4", 1], ["C4", 1.5], ["D4", 0.5], ["E4", 3],
      ["F4", 1], ["F4", 1], ["F4", 1], ["F4", 1],
      ["F4", 1], ["E4", 1], ["E4", 1], ["E4", 0.5], ["E4", 0.5],
      ["G4", 1], ["G4", 1], ["F4", 1], ["D4", 1],
      ["C4", 4],
    ],
  ),
];


const PRACTICE_SONGS: Song[] = [
  makeSong(
    {
      id: "practice-black-1",
      title: "黑键初见",
      category: "中级",
      difficulty: 4,
      bpm: 80,
      cover: "twinkle",
      tags: ["练习", "黑键"],
    },
    [
      ["C#4", 1.5], ["D#4", 1.5], ["F#4", 1.5], ["G#4", 1.5], ["A#4", 3],
      ["C#4", 1.5], ["D#4", 1.5], ["F#4", 1.5], ["G#4", 1.5], ["A#4", 3],
    ],
  ),
  makeSong(
    {
      id: "practice-black-2",
      title: "黑键五兄弟",
      category: "中级",
      difficulty: 4,
      bpm: 90,
      cover: "two-tigers",
      tags: ["练习", "黑键"],
    },
    [
      ["C4", 1], ["C#4", 1], ["D4", 1], ["D#4", 1], ["E4", 1],
      ["F4", 1], ["F#4", 1], ["G4", 1], ["G#4", 1], ["A4", 1],
      ["A#4", 1], ["B4", 1], ["C5", 1], ["C#4", 1], ["D#4", 1],
    ],
  ),
  makeSong(
    {
      id: "practice-c-major",
      title: "C 大三和弦",
      category: "和弦",
      difficulty: 7,
      bpm: 80,
      cover: "cde-etude",
      tags: ["练习", "和弦"],
    },
    [
      ["C4", 1], ["E4", 1], ["G4", 1], ["C5", 2],
      ["C4", 1], ["E4", 1], ["G4", 1], ["C5", 2],
    ],
  ),
  makeSong(
    {
      id: "practice-f-g",
      title: "F 与 G 和弦",
      category: "和弦",
      difficulty: 8,
      bpm: 90,
      cover: "ode-to-joy",
      tags: ["练习", "和弦"],
    },
    [
      ["F4", 1], ["A4", 1], ["C5", 1], ["F4", 2],
      ["G4", 1], ["B4", 1], ["D5", 1], ["G4", 2],
      ["F4", 1], ["A4", 1], ["C5", 1], ["G4", 2],
    ],
  ),
];

export function getSong(id: string): Song | undefined {
  return SONGS.find((song) => song.id === id) ?? PRACTICE_SONGS.find((song) => song.id === id);
}

export function starsForDifficulty(difficulty: number): number {
  if (difficulty >= 9) return 5;
  if (difficulty >= 7) return 4;
  if (difficulty >= 5) return 3;
  if (difficulty >= 3) return 2;
  return 1;
}
