import type { PerformanceEvent, PerformanceRecord, Timbre } from "../types";

export interface RecordingDraft {
  events: PerformanceEvent[];
  duration: number;
  timbre: Timbre;
}

export class Recorder {
  private readonly timbre: Timbre;
  private startedAt = 0;
  private running = false;
  private events: PerformanceEvent[] = [];
  private readonly openNotes = new Set<string>();

  constructor(timbre: Timbre) {
    this.timbre = timbre;
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    this.events = [];
    this.openNotes.clear();
    this.startedAt = performance.now();
    this.running = true;
  }

  noteDown(note: string, timbre: Timbre = this.timbre): void {
    if (!this.running) return;
    this.openNotes.add(note);
    this.events.push({
      note,
      type: "down",
      time: Math.round(performance.now() - this.startedAt),
      timbre,
    });
  }

  noteUp(note: string): void {
    if (!this.running) return;
    this.openNotes.delete(note);
    this.events.push({
      note,
      type: "up",
      time: Math.round(performance.now() - this.startedAt),
    });
  }

  stop(): RecordingDraft {
    this.running = false;
    const duration = Math.max(0, Math.round(performance.now() - this.startedAt));
    const now = duration;
    for (const note of this.openNotes) {
      this.events.push({ note, type: "up", time: now });
    }
    this.openNotes.clear();
    return {
      events: this.events.map((event) => ({ ...event })),
      duration,
      timbre: this.timbre,
    };
  }

  cancel(): void {
    this.running = false;
    this.events = [];
    this.openNotes.clear();
  }
}

export function makeRecord(
  draft: RecordingDraft,
  title: string,
  source: PerformanceRecord["source"] = "free",
  songId?: string,
): PerformanceRecord {
  return {
    id: `perf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    createdAt: Date.now(),
    duration: draft.duration,
    timbre: draft.timbre,
    source,
    songId,
    events: draft.events,
  };
}

export function defaultRecordTitle(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `我的演奏 ${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
