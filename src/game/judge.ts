import type { Grade, Judgment, Strictness } from "../types";

export interface JudgmentWindows {
  perfect: number;
  great: number;
  good: number;
}

export interface JudgmentResult {
  judgment: Judgment;
  delta: number;
}

export interface SessionSummary {
  total: number;
  perfect: number;
  great: number;
  good: number;
  miss: number;
  score: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  perfectRate: number;
  comboRate: number;
  timingScore: number;
  composite: number;
  grade: Grade;
}

export const BASE_SCORE: Record<Exclude<Judgment, "MISS">, number> = {
  PERFECT: 100,
  GREAT: 70,
  GOOD: 40,
};

export const ACCURACY_WEIGHT: Record<Judgment, number> = {
  PERFECT: 1,
  GREAT: 0.8,
  GOOD: 0.5,
  MISS: 0,
};

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5;
}

export function getJudgmentWindows(strictness: Strictness, bpm: number): JudgmentWindows {
  const strictnessFactor = strictness === "lenient" ? 1.3 : strictness === "strict" ? 0.75 : 1;
  const bpmFactor = bpm >= 140 ? 0.9 : bpm <= 80 ? 1.15 : 1;
  const factor = strictnessFactor * bpmFactor;
  return {
    perfect: Math.min(500, roundToFive(80 * factor)),
    great: Math.min(500, roundToFive(160 * factor)),
    good: Math.min(500, roundToFive(300 * factor)),
  };
}

export function judgeDelta(delta: number, windows: JudgmentWindows): JudgmentResult {
  const absolute = Math.abs(delta);
  if (absolute <= windows.perfect) {
    return { judgment: "PERFECT", delta };
  }
  if (absolute <= windows.great) {
    return { judgment: "GREAT", delta };
  }
  if (absolute <= windows.good) {
    return { judgment: "GOOD", delta };
  }
  return { judgment: "MISS", delta };
}

export function comboMultiplier(combo: number): number {
  if (combo >= 50) return 2;
  if (combo >= 20) return 1.5;
  if (combo >= 10) return 1.2;
  return 1;
}

export function gradeFromSummary(summary: Omit<SessionSummary, "grade">): Grade {
  let grade: Grade;
  if (summary.composite >= 0.95) {
    grade = "S";
  } else if (summary.composite >= 0.9) {
    grade = "A";
  } else if (summary.composite >= 0.8) {
    grade = "B";
  } else if (summary.composite >= 0.6) {
    grade = "C";
  } else {
    grade = "D";
  }

  if (grade === "S" && (summary.accuracy < 0.98 || summary.miss > 1)) {
    grade = "A";
  }
  if (grade === "A" && summary.accuracy < 0.9) {
    grade = "B";
  }
  return grade;
}

export class SessionScore {
  private perfect = 0;
  private great = 0;
  private good = 0;
  private missCount = 0;
  private total = 0;
  private scoreValue = 0;
  private comboValue = 0;
  private maxComboValue = 0;
  private deltaTotal = 0;
  private deltaCount = 0;
  private readonly useMultiplier: boolean;

  constructor(useMultiplier = true) {
    this.useMultiplier = useMultiplier;
  }

  get combo(): number {
    return this.comboValue;
  }

  get score(): number {
    return this.scoreValue;
  }

  get notesJudged(): number {
    return this.total;
  }

  record(judgment: Exclude<Judgment, "MISS">, delta = 0): number {
    this.total += 1;
    if (judgment === "PERFECT") this.perfect += 1;
    if (judgment === "GREAT") this.great += 1;
    if (judgment === "GOOD") this.good += 1;
    this.comboValue += 1;
    this.maxComboValue = Math.max(this.maxComboValue, this.comboValue);
    this.deltaTotal += Math.abs(delta);
    this.deltaCount += 1;

    const multiplier = this.useMultiplier ? comboMultiplier(this.comboValue) : 1;
    const gained = Math.round(BASE_SCORE[judgment] * multiplier);
    this.scoreValue += gained;
    return gained;
  }

  miss(delta = 0): void {
    this.total += 1;
    this.missCount += 1;
    this.comboValue = 0;
    this.deltaTotal += Math.abs(delta);
    this.deltaCount += 1;
  }

  getSummary(): SessionSummary {
    const safeTotal = Math.max(1, this.total);
    const accuracy =
      (this.perfect * ACCURACY_WEIGHT.PERFECT +
        this.great * ACCURACY_WEIGHT.GREAT +
        this.good * ACCURACY_WEIGHT.GOOD) /
      safeTotal;
    const perfectRate = this.perfect / safeTotal;
    const comboRate = Math.min(1, this.maxComboValue / safeTotal);
    const averageDelta = this.deltaCount > 0 ? this.deltaTotal / this.deltaCount : 0;
    const timingScore = Math.max(0, 1 - averageDelta / 300);
    const composite = accuracy * 0.55 + perfectRate * 0.2 + comboRate * 0.15 + timingScore * 0.1;

    const summary = {
      total: this.total,
      perfect: this.perfect,
      great: this.great,
      good: this.good,
      miss: this.missCount,
      score: this.scoreValue,
      combo: this.comboValue,
      maxCombo: this.maxComboValue,
      accuracy,
      perfectRate,
      comboRate,
      timingScore,
      composite,
    };

    return {
      ...summary,
      grade: gradeFromSummary(summary),
    };
  }
}

export function ratingScore(summary: SessionSummary): number {
  return Math.round(summary.composite * 1000) / 10;
}
