import { gradeFromSummary, type SessionSummary } from "../game/judge";
import { setPendingResult } from "../game/result";
import { Keyboard } from "../keyboard/keyboard";
import { getSong } from "../songs/data";
import type { AppContext } from "../ui/common";
import { element } from "../ui/dom";
import type { PerformanceEvent, SongNote } from "../types";

function splitPhrases(notes: SongNote[], bpm: number): SongNote[][] {
  const beat = 60000 / bpm;
  const phrases: SongNote[][] = [];
  let phrase: SongNote[] = [];
  let previousEnd = 0;
  notes.forEach((note) => {
    const gap = note.time - previousEnd;
    if (phrase.length >= 8 || (phrase.length > 0 && gap >= beat * 2)) {
      phrases.push(phrase);
      phrase = [];
    }
    phrase.push(note);
    previousEnd = note.time + note.duration;
  });
  if (phrase.length > 0) {
    phrases.push(phrase);
  }
  return phrases;
}

function makeSummary(total: number, correct: number, maxCombo: number): SessionSummary {
  const accuracy = total > 0 ? correct / total : 0;
  const perfectRate = accuracy;
  const comboRate = total > 0 ? Math.min(1, maxCombo / total) : 0;
  const composite = accuracy * 0.55 + perfectRate * 0.2 + comboRate * 0.15 + accuracy * 0.1;
  const base = {
    total,
    perfect: correct,
    great: 0,
    good: 0,
    miss: total - correct,
    score: 0,
    combo: maxCombo,
    maxCombo,
    accuracy,
    perfectRate,
    comboRate,
    timingScore: accuracy,
    composite,
  };
  return { ...base, grade: gradeFromSummary(base) };
}

export function followView(ctx: AppContext, songId: string): HTMLElement {
  const found = getSong(songId);
  const root = element("section", "follow-view");
  if (!found) {
    root.append(element("p", "empty-copy", "找不到这首曲目。"));
    return root;
  }
  const song = found;
  const phrases = splitPhrases(song.notes, song.bpm);

  const hud = element("div", "play-hud");
  const back = element("button", "back-btn", "←");
  back.type = "button";
  back.setAttribute("aria-label", "退出");
  back.addEventListener("click", () => {
    void (async () => {
      if (await ctx.confirm({ title: "退出本局？", message: "当前进度不会保存。", confirmText: "退出", danger: true })) {
        ctx.navigate(`/song/${song.id}`);
      }
    })();
  });
  const title = element("div", "play-title");
  title.append(element("strong", "", song.title), element("span", "", "跟我弹 · 新手"));
  const phraseLabel = element("div", "follow-phrase-label", "第 1 / 1 句");
  hud.append(back, title, phraseLabel);

  const stage = element("div", "follow-stage");
  const banner = element("div", "follow-banner", "准备");
  const target = element("div", "follow-target hidden");
  const targetNote = element("div", "follow-target-note", "C");
  const targetHint = element("div", "follow-target-hint", "按下面亮起的琴键");
  target.append(targetNote, targetHint);
  const feedback = element("div", "follow-feedback");
  const dotted = element("div", "follow-dots");
  const countdown = element("div", "countdown");
  stage.append(banner, target, feedback, dotted, countdown);

  const keyboardWrap = element("div", "play-keyboard");
  const keyboardMeta = element("div", "keyboard-meta");
  keyboardMeta.append(element("span", "", "听一句 · 跟一句"), element("span", "", "C4–E5 · 15 键"));
  const keyboard = new Keyboard({
    labels: ctx.profile.settings.keyLabels,
    onDown: (note) => {
      ctx.audio.playNote(note);
      handleDown(note);
    },
    onUp: (note) => {
      ctx.audio.releaseNote(note);
      if (recordStartedAt) {
        performanceEvents.push({ note, type: "up", time: Math.round(performance.now() - recordStartedAt) });
      }
    },
  });
  keyboardWrap.append(keyboardMeta, keyboard.element);
  root.append(hud, stage, keyboardWrap);

  let phraseIndex = 0;
  let targetIndex = 0;
  let inWait = false;
  let firstAttempt = true;
  let attempted = false;
  let total = 0;
  let correctFirst = 0;
  let combo = 0;
  let maxCombo = 0;
  let finished = false;
  const timers: number[] = [];
  const performanceEvents: PerformanceEvent[] = [];
  let recordStartedAt = 0;
  const autostart = window.location.hash.includes("autostart=1");
  let currentPhrase = phrases[0] ?? [];

  function clearTimers(): void {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.length = 0;
  }

  function setDots(): void {
    dotted.replaceChildren();
    phrases.forEach((_, index) => {
      const dot = element("i", "follow-dot");
      if (index < phraseIndex) dot.classList.add("done");
      if (index === phraseIndex) dot.classList.add("current");
      dotted.append(dot);
    });
    phraseLabel.textContent = `第 ${Math.min(phraseIndex + 1, phrases.length)} / ${phrases.length} 句`;
  }

  function showTarget(): void {
    const note = currentPhrase[targetIndex];
    if (!note) return;
    inWait = true;
    firstAttempt = true;
    attempted = false;
    banner.textContent = "轮到你";
    banner.className = "follow-banner turn";
    target.classList.remove("hidden");
    targetNote.textContent = note.notes.join(" + ");
    targetHint.textContent = "按下面亮起的琴键";
    keyboard.setEnabled(true);
    keyboard.setFocus(note.notes);
    keyboard.highlight(note.notes[0] ?? null);
    feedback.textContent = "";
    feedback.className = "follow-feedback";
  }

  function demoPhrase(): void {
    clearTimers();
    ctx.audio.stopAll();
    inWait = false;
    keyboard.setEnabled(false);
    keyboard.clearHighlight();
    keyboard.setFocus(currentPhrase.flatMap((note) => note.notes));
    banner.textContent = "听一听";
    banner.className = "follow-banner listen";
    target.classList.add("hidden");
    feedback.textContent = "";
    currentPhrase.forEach((note, index) => {
      timers.push(
        window.setTimeout(() => {
          keyboard.highlight(note.notes[0] ?? null);
          ctx.audio.playNote(note.notes[0] ?? "C4");
          const release = window.setTimeout(() => {
            ctx.audio.releaseNote(note.notes[0] ?? "C4");
          }, Math.min(420, note.duration));
          timers.push(release);
          if (index === currentPhrase.length - 1) {
            const wait = window.setTimeout(() => {
              ctx.audio.stopAll();
              keyboard.clearHighlight();
              targetIndex = 0;
              showTarget();
            }, Math.min(520, note.duration) + 260);
            timers.push(wait);
          }
        }, note.time - (currentPhrase[0]?.time ?? 0) + (autostart ? 0 : 0)),
      );
    });
    if (currentPhrase.length === 0) {
      showTarget();
    }
  }

  function handleDown(note: string): void {
    if (!inWait || finished) {
      return;
    }
    ctx.trackNote(note);
    if (recordStartedAt) {
      performanceEvents.push({
        note,
        type: "down",
        time: Math.round(performance.now() - recordStartedAt),
        velocity: 0.8,
        timbre: ctx.profile.settings.timbre,
      });
    }
    const expected = currentPhrase[targetIndex];
    if (!expected || !expected.notes.includes(note)) {
      if (!attempted) {
        attempted = true;
        firstAttempt = false;
        total += 1;
        showFeedback("再试一次", "bad");
        keyboard.highlight(expected?.notes[0] ?? null);
      }
      return;
    }
    if (!attempted) {
      total += 1;
      if (firstAttempt) {
        correctFirst += 1;
        combo += 1;
        maxCombo = Math.max(maxCombo, combo);
      }
    }
    showFeedback("很好", "good");
    targetIndex += 1;
    if (targetIndex >= currentPhrase.length) {
      inWait = false;
      keyboard.clearHighlight();
      phraseIndex += 1;
      setDots();
      if (phraseIndex >= phrases.length) {
        finish();
      } else {
        currentPhrase = phrases[phraseIndex] ?? [];
        target.classList.add("hidden");
        banner.textContent = "下一句";
        banner.className = "follow-banner";
        timers.push(window.setTimeout(demoPhrase, 500));
      }
    } else {
      showTarget();
    }
  }

  function showFeedback(text: string, tone: "good" | "bad"): void {
    feedback.textContent = text;
    feedback.className = `follow-feedback ${tone}`;
    window.setTimeout(() => {
      feedback.textContent = "";
      feedback.className = "follow-feedback";
    }, 420);
  }

  function finish(): void {
    if (finished) return;
    finished = true;
    inWait = false;
    keyboard.setEnabled(false);
    keyboard.clearHighlight();
    ctx.audio.stopAll();
    const summary = makeSummary(total, correctFirst, maxCombo);
    setPendingResult({
      mode: "follow",
      source: "follow",
      songId: song.id,
      title: song.title,
      summary,
      completedAt: Date.now(),
      record: {
        events: performanceEvents,
        duration: Math.round(performance.now() - recordStartedAt),
        timbre: ctx.profile.settings.timbre,
      },
      levelId: window.location.hash.match(/[?&]level=([^&]+)/)?.[1],
    });
    window.setTimeout(() => ctx.navigate("/result"), 450);
  }

  function begin(): void {
    recordStartedAt = performance.now();
    setDots();
    if (autostart) {
      demoPhrase();
      return;
    }
    const steps = ["3", "2", "1"];
    steps.forEach((label, index) => {
      timers.push(
        window.setTimeout(() => {
          countdown.textContent = label;
          countdown.classList.add("show");
        }, index * 600),
      );
    });
    timers.push(
      window.setTimeout(() => {
        countdown.classList.remove("show");
        demoPhrase();
      }, steps.length * 600),
    );
  }

  ctx.onCleanup(() => {
    clearTimers();
    keyboard.destroy();
    ctx.audio.stopAll();
  });

  begin();
  return root;
}
