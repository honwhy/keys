import { coverUrl } from "../assets";
import type { AppContext } from "../ui/common";
import { element } from "../ui/dom";
import { Keyboard } from "../keyboard/keyboard";

export function homeView(ctx: AppContext): HTMLElement {
  const root = element("section", "home-view");
  const main = element("div", "home-main");

  const hero = element("article", "hero-card");
  const cover = element("img", "hero-cover") as HTMLImageElement;
  cover.src = coverUrl(ctx.manifest, "twinkle");
  cover.alt = "小星星封面";
  const body = element("div", "hero-body");
  const eyebrow = element("p", "eyebrow", "继续演奏");
  const title = element("h1", "", "小星星");
  const sub = element("p", "sub", "入门 · Lv2 · 100 BPM · 32 秒");
  const chips = element("div", "chips");
  const best = ctx.profile.bestScores["twinkle:rhythm"];
  const bestGrade = best?.bestGrade ?? "—";
  const bestScore = best?.bestScore ? best.bestScore.toLocaleString("zh-CN") : "—";
  const bestCombo = best?.bestCombo ? String(best.bestCombo) : "—";
  [["最佳", bestGrade], ["得分", bestScore], ["Combo", bestCombo]].forEach(([label, value]) => {
    const chip = element("span", "chip");
    chip.append(document.createTextNode(`${label} `), element("b", "", value));
    chips.append(chip);
  });
  const play = element("button", "primary", "继续演奏");
  play.type = "button";
  play.innerHTML = "继续演奏 <span>→</span>";
  play.addEventListener("click", () => ctx.navigate("/songs"));
  body.append(eyebrow, title, sub, chips, play);
  hero.append(cover, body);

  const modes = element("section", "modes");
  const grid = element("div", "mode-grid");
  const modeData = [
    { icon: "♫", title: "跟我弹", copy: "听一句，跟一句", badge: "新手推荐", path: "/songs", tone: "cyan" },
    { icon: "▼", title: "节奏挑战", copy: "音符落下，按下琴键", badge: "最游戏化", path: "/songs", tone: "coral" },
    { icon: "♬", title: "自由演奏", copy: "按出和弦，看到名字", badge: "自由玩", path: "/free", tone: "gold" },
    { icon: "★", title: "闯关模式", copy: "一章一关，收集星星", badge: "P1", path: "/levels", tone: "blue" },
  ];

  modeData.forEach((item) => {
    const card = element("button", `mode-card tone-${item.tone}`);
    card.type = "button";
    card.dataset.mode = item.title;
    card.append(element("span", "mode-badge", item.badge));
    card.append(element("div", "mode-icon", item.icon));
    card.append(element("h3", "", item.title));
    card.append(element("p", "", item.copy));
    card.addEventListener("click", () => ctx.navigate(item.path));
    grid.append(card);
  });

  modes.append(grid);
  main.append(hero, modes);

  const keyboardWrap = element("div", "keyboard-preview-wrap");
  const meta = element("div", "keyboard-meta");
  const hint = element("span", "keyboard-hint");
  hint.innerHTML = '<span class="pulse-dot"></span>按 <b>C</b> 开始第一首';
  meta.append(hint, element("span", "", "C4–E5 · 15 键"));

  let hintTimer: number | undefined;
  const keyboard = new Keyboard({
    labels: ctx.profile.settings.keyLabels,
    onDown: (note) => {
      ctx.audio.playNote(note);
      ctx.trackNote(note);
      hint.textContent = `${note} · ${ctx.audio.frequencyOf(note).toFixed(2)} Hz`;
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => {
        hint.innerHTML = `继续按，或者点 <b>继续演奏</b>`;
      }, 900);
    },
    onUp: (note) => {
      ctx.audio.releaseNote(note);
    },
  });

  ctx.onCleanup(() => {
    window.clearTimeout(hintTimer);
    keyboard.destroy();
  });

  keyboardWrap.append(meta, keyboard.element);
  root.append(main, keyboardWrap);
  return root;
}
