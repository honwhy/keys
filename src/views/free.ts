import { Recorder, defaultRecordTitle, makeRecord } from "../recorder/recorder";
import { Keyboard } from "../keyboard/keyboard";
import type { AppContext } from "../ui/common";
import { element, promptDialog } from "../ui/dom";
import type { Timbre } from "../types";

const PC: Record<string, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};
const PC_NAME = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const QUALITY = [
  { ints: [0, 4, 7], en: "Major", cn: "大三和弦" },
  { ints: [0, 3, 7], en: "Minor", cn: "小三和弦" },
  { ints: [0, 3, 6], en: "Diminished", cn: "减三和弦" },
  { ints: [0, 4, 8], en: "Augmented", cn: "增三和弦" },
  { ints: [0, 2, 7], en: "Sus2", cn: "挂二和弦" },
  { ints: [0, 5, 7], en: "Sus4", cn: "挂四和弦" },
];

function notePc(note: string): number {
  return PC[note.replace(/\d/, "")] ?? 0;
}

export function freeView(ctx: AppContext): HTMLElement {
  const root = element("section", "free-view");
  const hud = element("div", "free-hud");
  const back = element("button", "back-btn", "←");
  back.type = "button";
  back.setAttribute("aria-label", "返回首页");
  back.addEventListener("click", () => ctx.navigate("/home"));
  const title = element("div", "play-title");
  title.append(element("strong", "", "自由演奏"), element("span", "", "随便弹 · 不判定"));
  const timbres = element("div", "timbre-switch");
  const timbreButtons: HTMLButtonElement[] = [];
  (["piano", "bell", "synth"] as Timbre[]).forEach((timbre) => {
    const button = element("button", "timbre-btn", timbre === "piano" ? "Piano" : timbre === "bell" ? "Bell" : "Synth");
    button.type = "button";
    button.classList.toggle("active", ctx.profile.settings.timbre === timbre);
    button.addEventListener("click", () => {
      ctx.profile.settings.timbre = timbre;
      ctx.save();
      timbreButtons.forEach((node) => node.classList.toggle("active", node === button));
      void ctx.audio.playSfx("uiTap", 0.2);
    });
    timbreButtons.push(button);
    timbres.append(button);
  });
  const metronome = element("button", "metronome-btn", "♩ 100");
  metronome.type = "button";
  const record = element("button", "record-btn", "● 录制");
  record.type = "button";
  hud.append(back, title, timbres, metronome, record);

  const stage = element("div", "free-stage");
  const chordPanel = element("div", "chord-panel");
  const chordTag = element("span", "chord-tag", "CHORD DETECTOR");
  const chordEn = element("div", "chord-en", "随便弹点什么");
  const chordCn = element("div", "chord-cn", "同时按住 2～4 个音");
  const chordNotes = element("div", "chord-notes");
  chordPanel.append(chordTag, chordEn, chordCn, chordNotes);
  const recordStatus = element("div", "record-status");
  stage.append(chordPanel, recordStatus);

  const keyboardWrap = element("div", "play-keyboard");
  const keyboardMeta = element("div", "keyboard-meta");
  keyboardMeta.append(element("span", "", "按住 2～4 个音识别和弦"), element("span", "", "C4–E5 · 15 键"));
  const active = new Set<string>();
  let metronomeTimer: number | undefined;
  let metronomeOn = false;
  let bpm = 100;
  let recorder: Recorder | null = null;
  let recordingTimer: number | undefined;
  let recordStartedAt = 0;

  const keyboard = new Keyboard({
    labels: ctx.profile.settings.keyLabels,
    onDown: (note) => {
      ctx.audio.playNote(note);
      ctx.trackNote(note);
      active.add(note);
      recorder?.noteDown(note, ctx.profile.settings.timbre);
      updateChord();
    },
    onUp: (note) => {
      ctx.audio.releaseNote(note);
      active.delete(note);
      recorder?.noteUp(note);
      updateChord();
    },
  });
  keyboardWrap.append(keyboardMeta, keyboard.element);
  root.append(hud, stage, keyboardWrap);

  function updateChord(): void {
    if (active.size < 2) {
      chordEn.textContent = active.size === 1 ? [...active][0] ?? "—" : "随便弹点什么";
      chordCn.textContent = active.size === 1 ? "单音" : "同时按住 2～4 个音";
      chordNotes.replaceChildren(...[...active].map((note) => element("span", "", note)));
      return;
    }
    const list = [...active];
    const pcs = [...new Set(list.map(notePc))];
    chordNotes.replaceChildren(...list.map((note) => element("span", "", note)));
    if (pcs.length >= 3) {
      for (const quality of QUALITY) {
        for (const root of pcs) {
          const rel = pcs.map((pc) => (pc - root + 12) % 12).sort((a, b) => a - b);
          if (rel.join(",") === quality.ints.join(",")) {
            chordEn.textContent = `${PC_NAME[root]} ${quality.en}`;
            chordCn.textContent = `${PC_NAME[root]} ${quality.cn}`;
            ctx.unlockAchievement("A06");
            return;
          }
        }
      }
    }
    chordEn.textContent = "—";
    chordCn.textContent = pcs.length > 4 ? "同时按 2～4 个音试试" : "这个组合还没有名字";
  }

  function stopMetronome(): void {
    metronomeOn = false;
    metronome.classList.remove("on");
    if (metronomeTimer !== undefined) {
      window.clearInterval(metronomeTimer);
      metronomeTimer = undefined;
    }
  }

  function startMetronome(): void {
    metronomeOn = true;
    metronome.classList.add("on");
    metronome.textContent = `♩ ${bpm}`;
    let beat = 0;
    metronomeTimer = window.setInterval(() => {
      void ctx.audio.playSfx("uiTap", beat % 4 === 0 ? 0.5 : 0.22);
      beat += 1;
    }, 60000 / bpm);
  }

  metronome.addEventListener("click", () => {
    if (metronomeOn) {
      stopMetronome();
      return;
    }
    startMetronome();
  });

  function updateRecordStatus(): void {
    if (!recorder) {
      recordStatus.textContent = "";
      recordStatus.classList.remove("visible");
      return;
    }
    const elapsed = performance.now() - recordStartedAt;
    const seconds = Math.floor(elapsed / 1000);
    recordStatus.textContent = `● 录制中 ${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")} · 最长 05:00`;
    recordStatus.classList.add("visible");
  }

  async function stopRecording(): Promise<void> {
    if (!recorder) return;
    const draft = recorder.stop();
    recorder = null;
    window.clearInterval(recordingTimer);
    recordingTimer = undefined;
    record.classList.remove("recording");
    record.textContent = "● 录制";
    recordStatus.classList.remove("visible");
    if (draft.events.length === 0 || draft.duration < 500) {
      ctx.toast("至少弹一个音再保存。", "error");
      return;
    }
    const title = await promptDialog({
      title: "保存演奏",
      message: `${Math.round(draft.duration / 1000)} 秒 · ${draft.events.filter((event) => event.type === "down").length} 个音`,
      value: defaultRecordTitle(),
      confirmText: "保存",
    });
    if (!title) {
      ctx.toast("已丢弃本次演奏", "default");
      return;
    }
    if (ctx.profile.records.length >= 20) {
      ctx.toast("最多保存 20 条演奏，请先删除旧作品。", "error");
      return;
    }
    ctx.profile.records.unshift(makeRecord(draft, title));
    ctx.profile.records = ctx.profile.records.slice(0, 20);
    ctx.save();
    ctx.checkAchievements();
    ctx.toast("已保存到我的演奏", "success");
  }

  record.addEventListener("click", () => {
    void (async () => {
      if (recorder) {
        await stopRecording();
        return;
      }
      if (ctx.profile.records.length >= 20) {
        ctx.toast("最多保存 20 条演奏，请先删除旧作品。", "error");
        return;
      }
      record.disabled = true;
      const steps = ["3", "2", "1"];
      steps.forEach((step, index) => {
        window.setTimeout(() => {
          record.textContent = step;
        }, index * 500);
      });
      window.setTimeout(() => {
        record.disabled = false;
        recorder = new Recorder(ctx.profile.settings.timbre);
        recorder.start();
        recordStartedAt = performance.now();
        record.classList.add("recording");
        record.textContent = "■ 停止";
        updateRecordStatus();
        recordingTimer = window.setInterval(updateRecordStatus, 500);
        window.setTimeout(() => {
          if (recorder) void stopRecording();
        }, 300000);
      }, steps.length * 500);
    })();
  });

  ctx.onCleanup(() => {
    stopMetronome();
    window.clearInterval(recordingTimer);
    recorder?.cancel();
    recorder = null;
    keyboard.destroy();
    ctx.audio.stopAll();
  });

  updateChord();
  return root;
}
