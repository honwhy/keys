import type { AudioEngine } from "../audio/engine";
import type { PerformanceRecord } from "../types";

export interface PlayerCallbacks {
  onDown?: (note: string) => void;
  onUp?: (note: string) => void;
  onProgress?: (elapsed: number, duration: number) => void;
  onEnd?: () => void;
}

export class PerformancePlayer {
  private readonly engine: AudioEngine;
  private readonly record: PerformanceRecord;
  private readonly callbacks: PlayerCallbacks;
  private timers: number[] = [];
  private progressTimer: number | undefined;
  private startedAt = 0;
  private active = false;

  constructor(engine: AudioEngine, record: PerformanceRecord, callbacks: PlayerCallbacks = {}) {
    this.engine = engine;
    this.record = record;
    this.callbacks = callbacks;
  }

  get isPlaying(): boolean {
    return this.active;
  }

  play(): void {
    if (this.active) return;
    this.active = true;
    this.startedAt = performance.now();
    const duration = Math.max(1, this.record.duration);
    this.record.events.forEach((event) => {
      const timer = window.setTimeout(() => {
        if (!this.active) return;
        if (event.type === "down") {
          this.engine.playNote(event.note, {
            timbre: event.timbre ?? this.record.timbre,
            velocity: event.velocity,
          });
          this.callbacks.onDown?.(event.note);
        } else {
          this.engine.releaseNote(event.note);
          this.callbacks.onUp?.(event.note);
        }
      }, Math.max(0, event.time));
      this.timers.push(timer);
    });

    this.progressTimer = window.setInterval(() => {
      if (!this.active) return;
      const elapsed = performance.now() - this.startedAt;
      this.callbacks.onProgress?.(Math.min(duration, elapsed), duration);
    }, 80);

    this.timers.push(
      window.setTimeout(() => {
        this.stop(true);
      }, duration + 350),
    );
  }

  stop(emitEnd = true): void {
    if (!this.active) return;
    this.active = false;
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];
    if (this.progressTimer !== undefined) {
      window.clearInterval(this.progressTimer);
      this.progressTimer = undefined;
    }
    this.engine.stopAll();
    this.record.events.forEach((event) => {
      if (event.type === "down") {
        this.callbacks.onUp?.(event.note);
      }
    });
    if (emitEnd) {
      this.callbacks.onEnd?.();
    }
  }
}
