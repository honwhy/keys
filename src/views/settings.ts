import type { AppContext } from "../ui/common";
import { confirmDialog, element, formatBytes, showToast } from "../ui/dom";
import { clearProfile, createDefaultProfile, profileSizeBytes } from "../storage/profile";
import type { Reverb, Strictness, Timbre } from "../types";

function section(title: string): HTMLElement {
  const node = element("section", "settings-section");
  node.append(element("h2", "settings-section-title", title));
  return node;
}

function rangeRow(
  ctx: AppContext,
  label: string,
  key: "masterVolume" | "musicVolume" | "effectVolume" | "calibration",
  min: number,
  max: number,
  step: number,
  suffix = "",
): HTMLElement {
  const row = element("label", "setting-row");
  const head = element("span", "setting-label", label);
  const value = element("span", "setting-value");
  const input = element("input", "range-input") as HTMLInputElement;
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(ctx.profile.settings[key]);
  value.textContent = `${input.value}${suffix}`;
  input.addEventListener("input", () => {
    const next = Number(input.value);
    ctx.profile.settings[key] = next;
    value.textContent = `${input.value}${suffix}`;
    ctx.save();
  });
  row.append(head, value, input);
  return row;
}

function choiceRow<T extends string>(
  label: string,
  values: Array<{ value: T; label: string }>,
  current: T,
  onSelect: (value: T) => void,
): HTMLElement {
  const row = element("div", "setting-row");
  row.append(element("span", "setting-label", label));
  const group = element("div", "choice-group");
  const buttons: HTMLButtonElement[] = [];
  values.forEach((item) => {
    const button = element("button", "choice-btn", item.label);
    button.type = "button";
    button.dataset.value = item.value;
    if (item.value === current) {
      button.classList.add("active");
    }
    button.addEventListener("click", () => {
      buttons.forEach((node) => node.classList.toggle("active", node === button));
      onSelect(item.value);
    });
    buttons.push(button);
    group.append(button);
  });
  row.append(group);
  return row;
}

function toggleRow(
  label: string,
  description: string,
  value: boolean,
  onToggle: (next: boolean) => void,
): HTMLElement {
  const row = element("div", "setting-row toggle-row");
  const text = element("span", "toggle-text");
  text.append(element("span", "setting-label", label), element("span", "setting-help", description));
  const button = element("button", "switch");
  button.type = "button";
  button.setAttribute("role", "switch");
  button.setAttribute("aria-checked", String(value));
  button.classList.toggle("on", value);
  button.addEventListener("click", () => {
    const next = !button.classList.contains("on");
    button.classList.toggle("on", next);
    button.setAttribute("aria-checked", String(next));
    onToggle(next);
  });
  row.append(text, button);
  return row;
}

export function settingsView(ctx: AppContext): HTMLElement {
  const root = element("section", "settings-view");
  const head = element("header", "view-head");
  const back = element("button", "back-btn", "←");
  back.type = "button";
  back.setAttribute("aria-label", "返回首页");
  back.addEventListener("click", () => ctx.navigate("/home"));
  const titleBox = element("div", "view-titlebox");
  titleBox.append(element("p", "eyebrow", "SETTINGS"), element("h1", "", "设置"));
  head.append(back, titleBox);
  root.append(head);

  const scroll = element("div", "settings-scroll");
  const previewTimers: number[] = [];
  const previewTimbre = (): void => {
    ["C4", "E4", "G4"].forEach((note, index) => {
      previewTimers.push(
        window.setTimeout(() => {
          ctx.audio.playNote(note);
          previewTimers.push(window.setTimeout(() => ctx.audio.releaseNote(note), 420));
        }, index * 130),
      );
    });
  };
  ctx.onCleanup(() => {
    previewTimers.forEach((timer) => window.clearTimeout(timer));
    ctx.audio.stopAll();
  });

  const sound = section("声音");
  sound.append(
    rangeRow(ctx, "主音量", "masterVolume", 0, 100, 5, "%"),
    rangeRow(ctx, "音乐音量", "musicVolume", 0, 100, 5, "%"),
    rangeRow(ctx, "效果音量", "effectVolume", 0, 100, 5, "%"),
    choiceRow<Timbre>(
      "音色",
      [
        { value: "piano", label: "Piano" },
        { value: "bell", label: "Bell" },
        { value: "synth", label: "Synth" },
      ],
      ctx.profile.settings.timbre,
      (value) => {
        ctx.profile.settings.timbre = value;
        ctx.save();
        previewTimbre();
      },
    ),
    choiceRow<Reverb>(
      "混响",
      [
        { value: "off", label: "关" },
        { value: "low", label: "低" },
        { value: "mid", label: "中" },
      ],
      ctx.profile.settings.reverb,
      (value) => {
        ctx.profile.settings.reverb = value;
        ctx.save();
      },
    ),
    (() => {
      const row = element("div", "setting-row");
      row.append(element("span", "setting-label", "试听"));
      const preview = element("button", "btn btn-ghost", "C · E · G");
      preview.type = "button";
      preview.addEventListener("click", previewTimbre);
      row.append(preview);
      return row;
    })(),
    element("p", "setting-note", "音量、音色与混响实时生效，设置会保存在本机。"),
  );

  const judge = section("判定");
  judge.append(
    choiceRow<Strictness>(
      "严格度",
      [
        { value: "lenient", label: "宽松" },
        { value: "standard", label: "标准" },
        { value: "strict", label: "严格" },
      ],
      ctx.profile.settings.strictness,
      (value) => {
        ctx.profile.settings.strictness = value;
        ctx.save();
      },
    ),
    rangeRow(ctx, "音画校准", "calibration", -200, 200, 10, "ms"),
    element("p", "setting-note", "判定窗口与校准将在 F04 判定与计分 Feature 中接入。"),
  );

  const experience = section("体验");
  experience.append(
    toggleRow("震动", "Combo 里程碑与错误提示", ctx.profile.settings.haptics, (next) => {
      ctx.profile.settings.haptics = next;
      ctx.save();
    }),
    toggleRow("减少动效", "关闭粒子、震动与强动画", ctx.profile.settings.reducedMotion, (next) => {
      ctx.profile.settings.reducedMotion = next;
      document.documentElement.dataset.reducedMotion = String(next);
      ctx.save();
    }),
    toggleRow("音名标签", "在琴键上显示 C / D / E", ctx.profile.settings.keyLabels, (next) => {
      ctx.profile.settings.keyLabels = next;
      ctx.save();
    }),
  );

  const data = section("数据");
  const sizeRow = element("div", "setting-row");
  sizeRow.append(element("span", "setting-label", "本地占用"));
  sizeRow.append(element("span", "setting-value", formatBytes(profileSizeBytes(ctx.profile))));
  data.append(sizeRow);

  const createDataButton = (label: string, onClick: () => void, danger = false) => {
    const button = element("button", `data-btn${danger ? " danger" : ""}`, label);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
  };

  data.append(
    createDataButton("清除演奏记录", () => {
      void (async () => {
        if (
          await confirmDialog({
            title: "清除演奏记录？",
            message: "所有已保存的演奏记录将被删除，且无法恢复。",
            confirmText: "删除记录",
            danger: true,
          })
        ) {
          ctx.profile.records = [];
          ctx.save();
          showToast("演奏记录已清除", "success");
          ctx.render();
        }
      })();
    }),
    createDataButton(
      "清除成绩、成就与闯关进度",
      () => {
        void (async () => {
          if (
            await confirmDialog({
              title: "清除成绩与进度？",
              message: "最佳成绩、成就、闯关星级和每日挑战将被重置，且无法恢复。",
              confirmText: "清除进度",
              danger: true,
            })
          ) {
            const defaults = createDefaultProfile();
            ctx.profile.bestScores = {};
            ctx.profile.achievements = defaults.achievements;
            ctx.profile.levels = defaults.levels;
            ctx.profile.daily = null;
            ctx.profile.firstSongCompleted = false;
            ctx.profile.lastSongId = undefined;
            ctx.save();
            showToast("成绩与进度已清除", "success");
            ctx.render();
          }
        })();
      },
      true,
    ),
    createDataButton(
      "清除全部数据",
      () => {
        void (async () => {
          if (
            await confirmDialog({
              title: "清除全部数据？",
              message: "这会把设置、成绩、演奏记录、成就和闯关进度全部删除。操作不可恢复。",
              confirmText: "全部清除",
              danger: true,
            })
          ) {
            clearProfile();
            window.location.reload();
          }
        })();
      },
      true,
    ),
  );

  const about = section("关于");
  const aboutRow = element("div", "setting-row");
  aboutRow.append(element("span", "setting-label", "版本"));
  aboutRow.append(element("span", "setting-value", "0.1.0 · F00"));
  about.append(
    aboutRow,
    element("p", "setting-note", "KeyTune · 键音 — 手机横屏音乐小游戏。无账号、无上传、数据保存在本机。"),
  );

  scroll.append(sound, judge, experience, data, about);
  root.append(scroll);
  return root;
}
