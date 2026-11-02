import { getJudgmentWindows, judgeDelta, SessionScore, type SessionSummary } from "../game/judge";
import { setPendingResult } from "../game/result";
import { todayKey } from "../daily/daily";
import { Keyboard } from "../keyboard/keyboard";
import { getSong } from "../songs/data";
import type { AppContext } from "../ui/common";
import { element } from "../ui/dom";
import type { PerformanceEvent, SongNote } from "../types";

const WHITE = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"];
const BLACK_POS: Record<string, number> = {
  "C#4": 10,
  "D#4": 20,
  "F#4": 40,
  "G#4": 50,
  "A#4": 60,
};

function lanePercent(note: string): number {
  const whiteIndex = WHITE.indexOf(note);
  if (whiteIndex >= 0) {
    return (whiteIndex + 0.5) * 10;
  }
  return BLACK_POS[note] ?? 50;
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

interface NoteView {
  note: SongNote;
  element: HTMLElement;
  judged: boolean;
}

export function rhythmView(ctx: AppContext, songId: string): HTMLElement {
  const found = getSong(songId);
  const root = element("section", "play-view");
  if (!found) {
    root.append(element("p", "empty-copy", "找不到这首曲目。"));
    return root;
  }
  const song = found;

  const hud = element("div", "play-hud");
  const back = element("button", "back-btn", "←");
  back.type = "button";
  back.setAttribute("aria-label", "退出游戏");
  back.addEventListener("click", () => {
    void (async () => {
      if (await ctx.confirm({ title: "退出本局？", message: "当前成绩不会保存。", confirmText: "退出", danger: true })) {
        ctx.navigate(`/song/${song.id}`);
      }
    })();
  });
  const title = element("div", "play-title");
  title.append(element("strong", "", song.title), element("span", "", "节奏挑战 · 标准"));
  const progress = element("div", "play-progress");
  const progressBar = element("i");
  progress.append(progressBar);
  const scoreLabel = element("div", "play-score");
  const scoreValue = element("b", "", "0");
  scoreLabel.append(scoreValue, element("span", "", "SCORE"));
  const pause = element("button", "pause-btn", "Ⅱ");
  pause.type = "button";
  pause.setAttribute("aria-label", "暂停");
  hud.append(back, title, progress, scoreLabel, pause);

  const field = element("div", "game-field");
  const lanes = element("div", "game-lanes");
  for (let i = 0; i < 10; i += 1) {
    const lane = element("i", "game-lane");
    lane.style.left = `${i * 10}%`;
    lanes.append(lane);
  }
  const notesLayer = element("div", "game-notes");
  const judgmentLine = element("div", "judgment-line");
  const judgment = element("div", "judgment-text");
  const combo = element("div", "combo-badge hidden");
  const comboNum = element("b", "", "0");
  combo.append(element("span", "", "🔥"), comboNum, element("span", "", "COMBO"));
  const countdown = element("div", "countdown");
  const pauseOverlay = element("div", "pause-overlay hidden");
  const pauseCard = element("div", "pause-card");
  const pauseTitle = element("h2", "", "已暂停");
  const resume = element("button", "btn btn-primary", "继续");
  const restart = element("button", "btn btn-ghost", "重开");
  const quit = element("button", "btn btn-ghost", "退出");
  resume.type = "button";
  restart.type = "button";
  quit.type = "button";
  pauseCard.append(pauseTitle, resume, restart, quit);
  pauseOverlay.append(pauseCard);
  field.append(lanes, notesLayer, judgmentLine, judgment, combo, countdown, pauseOverlay);

  const keyboardWrap = element("div", "play-keyboard");
  const keyboardMeta = element("div", "keyboard-meta");
  keyboardMeta.append(element("span", "", `${song.focusKeys?.join(" · ") ?? "C4 – E5"}`), element("span", "", formatDuration(song.duration)));
  const keyboard = new Keyboard({
    labels: ctx.profile.settings.keyLabels,
    onDown: (note) => {
      ctx.audio.playNote(note);
      handleDown(note);
    },
    onUp: (note) => {
      ctx.audio.releaseNote(note);
      if (startAt) {
        performanceEvents.push({
          note,
          type: "up",
          time: Math.round(performance.now() - startAt),
        });
      }
    },
  });
  keyboardWrap.append(keyboardMeta, keyboard.element);
  root.append(hud, field, keyboardWrap);

  const windows = getJudgmentWindows(ctx.profile.settings.strictness, song.bpm);
  const calibration = ctx.profile.settings.calibration;
  const lead = 1200;
  const chartOffset = lead;
  const score = new SessionScore(true);
  const noteViews: NoteView[] = [];
  const performanceEvents: PerformanceEvent[] = [];
  let startAt = 0;
  let raf = 0;
  let paused = false;
  let ended = false;
  let pausedAt = 0;
  let lastCombo = 0;
  let judgmentTimer: number | undefined;
  let countdownTimers: number[] = [];
  let fieldHeight = 0;
  let noteHeight = 58;

  const autostart = window.location.hash.includes("autostart=1");

  song.notes.forEach((note) => {
    const el = element("div", `game-note${note.notes.length > 1 ? " chord" : ""}`);
    if (note.notes.length === 1 && BLACK_POS[note.notes[0]] !== undefined) {
      el.classList.add("black");
    }
    el.textContent = note.notes.length > 1 ? note.notes[0].replace(/\d/, "") : note.notes[0] ?? "";
    el.style.left = `${lanePercent(note.notes[0] ?? "C4")}%`;
    el.style.display = "none";
    notesLayer.append(el);
    noteViews.push({ note, element: el, judged: false });
  });

  function updateScore(): void {
    scoreValue.textContent = score.score.toLocaleString("zh-CN");
    comboNum.textContent = String(score.combo);
    combo.classList.toggle("hidden", score.combo < 2);
    if (score.combo >= 50 && lastCombo < 50) {
      void ctx.audio.playSfx("combo50", 0.5);
    }
    lastCombo = score.combo;
  }

  function showJudgment(text: string): void {
    judgment.textContent = text;
    judgment.className = `judgment-text show judgment-${text.toLowerCase()}`;
    window.clearTimeout(judgmentTimer);
    judgmentTimer = window.setTimeout(() => {
      judgment.classList.remove("show");
    }, 460);
  }

  function hitSfx(judgmentValue: string): void {
    const key =
      judgmentValue === "PERFECT"
        ? "judgePerfect"
        : judgmentValue === "GREAT"
          ? "judgeGreat"
          : judgmentValue === "GOOD"
            ? "judgeGood"
            : "judgeMiss";
    void ctx.audio.playSfx(key, judgmentValue === "MISS" ? 0.4 : 0.55);
  }

  function markJudged(view: NoteView, hit: boolean): void {
    view.judged = true;
    view.element.classList.add(hit ? "hit" : "missed");
    window.setTimeout(() => {
      view.element.style.display = "none";
    }, hit ? 90 : 160);
  }

  function missNote(view: NoteView): void {
    score.miss();
    markJudged(view, false);
    showJudgment("MISS");
    hitSfx("MISS");
    updateScore();
  }

  function handleDown(note: string): void {
    if (!startAt || paused || ended) {
      return;
    }
    ctx.trackNote(note);
    performanceEvents.push({
      note,
      type: "down",
      time: Math.round(performance.now() - startAt),
      velocity: 0.8,
      timbre: ctx.profile.settings.timbre,
    });
    const now = performance.now() - startAt - calibration;
    let target: NoteView | null = null;
    let bestDistance = Infinity;
    for (const view of noteViews) {
      if (view.judged || !view.note.notes.includes(note)) {
        continue;
      }
      const distance = Math.abs(now - (view.note.time + chartOffset));
      if (distance <= windows.good && distance < bestDistance) {
        target = view;
        bestDistance = distance;
      }
    }
    if (!target) {
      return;
    }
    const delta = now - (target.note.time + chartOffset);
    const result = judgeDelta(delta, windows);
    if (result.judgment === "MISS") {
      return;
    }
    score.record(result.judgment, delta);
    markJudged(target, true);
    showJudgment(result.judgment);
    hitSfx(result.judgment);
    updateScore();
  }

  function renderFrame(now: number): void {
    if (!startAt || paused || ended) {
      return;
    }
    const elapsed = now - startAt;
    const fieldRect = field.getBoundingClientRect();
    fieldHeight = fieldRect.height;
    const travel = Math.max(20, fieldHeight - noteHeight - 18);
    const progress = Math.min(1, Math.max(0, elapsed / Math.max(1, song.duration)));
    progressBar.style.width = `${progress * 100}%`;

    for (const view of noteViews) {
      if (view.judged) {
        continue;
      }
      const remaining = view.note.time + chartOffset - elapsed;
      if (remaining > lead) {
        view.element.style.display = "none";
        continue;
      }
      if (remaining < -windows.good) {
        missNote(view);
        continue;
      }
      view.element.style.display = "flex";
      const noteProgress = Math.min(1.08, Math.max(0, 1 - remaining / lead));
      view.element.style.top = `${noteProgress * travel}px`;
      view.element.style.opacity = remaining < -windows.good * 0.5 ? "0.5" : "1";
    }

    if (elapsed > song.duration + chartOffset) {
      finish();
      return;
    }
    raf = requestAnimationFrame(renderFrame);
  }

  function start(): void {
    fieldHeight = field.getBoundingClientRect().height;
    noteHeight = notesLayer.querySelector<HTMLElement>(".game-note")?.offsetHeight ?? 58;
    startAt = performance.now();
    keyboard.setEnabled(true);
    raf = requestAnimationFrame(renderFrame);
  }

  function countdownStart(): void {
    if (autostart) {
      startAt = performance.now() - 200;
      keyboard.setEnabled(true);
      raf = requestAnimationFrame(renderFrame);
      return;
    }
    keyboard.setEnabled(false);
    const steps = ["3", "2", "1", "开始"];
    steps.forEach((label, index) => {
      countdownTimers.push(
        window.setTimeout(() => {
          countdown.textContent = label;
          countdown.classList.add("show");
          if (index === steps.length - 1) {
            window.setTimeout(() => {
              countdown.classList.remove("show");
              start();
            }, 350);
          }
        }, index * 700),
      );
    });
  }

  function finish(): void {
    if (ended) {
      return;
    }
    ended = true;
    cancelAnimationFrame(raf);
    keyboard.setEnabled(false);
    ctx.audio.stopAll();
    const summary: SessionSummary = score.getSummary();
    setPendingResult({
      mode: "rhythm",
      source: "rhythm",
      songId: song.id,
      title: song.title,
      summary,
      completedAt: Date.now(),
      record: {
        events: performanceEvents,
        duration: Math.round(performance.now() - startAt),
        timbre: ctx.profile.settings.timbre,
      },
      dailyDate: window.location.hash.includes("daily=1") ? todayKey() : undefined,
      levelId: window.location.hash.match(/[?&]level=([^&]+)/)?.[1],
    });
    window.setTimeout(() => ctx.navigate("/result"), 450);
  }

  function pauseGame(): void {
    if (!startAt || paused || ended) {
      return;
    }
    paused = true;
    pausedAt = performance.now();
    keyboard.setEnabled(false);
    ctx.audio.stopAll();
    pauseOverlay.classList.remove("hidden");
  }

  function resumeGame(): void {
    if (!paused) {
      return;
    }
    paused = false;
    startAt += performance.now() - pausedAt;
    keyboard.setEnabled(true);
    pauseOverlay.classList.add("hidden");
    raf = requestAnimationFrame(renderFrame);
  }

  pause.addEventListener("click", pauseGame);
  resume.addEventListener("click", resumeGame);
  restart.addEventListener("click", () => {
    ctx.navigate(`/game/rhythm/${song.id}`);
  });
  quit.addEventListener("click", () => ctx.navigate(`/song/${song.id}`));
  const onVisibility = (): void => {
    if (document.hidden) {
      pauseGame();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  ctx.onCleanup(() => {
    ended = true;
    cancelAnimationFrame(raf);
    countdownTimers.forEach((timer) => window.clearTimeout(timer));
    window.clearTimeout(judgmentTimer);
    document.removeEventListener("visibilitychange", onVisibility);
    keyboard.destroy();
    ctx.audio.stopAll();
  });

  countdownStart();
  return root;
}
