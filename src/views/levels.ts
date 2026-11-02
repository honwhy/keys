import { CHAPTERS, isChapterUnlocked, isLevelUnlocked } from "../levels/data";
import type { AppContext } from "../ui/common";
import { element } from "../ui/dom";

export function levelsView(ctx: AppContext): HTMLElement {
  const root = element("section", "levels-view");
  const head = element("header", "view-head");
  const titleBox = element("div", "view-titlebox");
  titleBox.append(element("p", "eyebrow", "LEVELS"), element("h1", "", "闯关"));
  const totalStars = Object.values(ctx.profile.levels.stars).reduce((sum, stars) => sum + stars, 0);
  head.append(titleBox, element("span", "view-summary", `★ ${totalStars} / ${CHAPTERS.flatMap((chapter) => chapter.levels).length * 3}`));
  root.append(head);

  const tabs = element("div", "chapter-tabs");
  const body = element("div", "levels-body");
  const lastChapter = CHAPTERS.find((chapter) => chapter.id === ctx.profile.levels.chapterUnlocked.at(-1))?.id ?? 1;
  let current = lastChapter;

  const render = (): void => {
    tabs.replaceChildren();
    CHAPTERS.forEach((chapter) => {
      const unlocked = isChapterUnlocked(ctx.profile, chapter.id);
      const tab = element("button", `chapter-tab${chapter.id === current ? " active" : ""}${unlocked ? "" : " locked"}`);
      tab.type = "button";
      tab.textContent = unlocked ? `第${chapter.id}章 · ${chapter.title}` : `第${chapter.id}章 🔒`;
      tab.addEventListener("click", () => {
        if (!unlocked) {
          ctx.toast("先完成上一章全部关卡。", "error");
          return;
        }
        current = chapter.id;
        render();
      });
      tabs.append(tab);
    });

    const chapter = CHAPTERS.find((item) => item.id === current) ?? CHAPTERS[0];
    body.replaceChildren();
    if (!chapter) return;
    const chapterHead = element("div", "chapter-head");
    chapterHead.append(element("h2", "", chapter.title), element("p", "", chapter.subtitle));
    body.append(chapterHead);

    const grid = element("div", "level-grid");
    chapter.levels.forEach((level) => {
      const unlocked = isLevelUnlocked(ctx.profile, level);
      const stars = ctx.profile.levels.stars[level.id] ?? 0;
      const card = element("button", `level-card${unlocked ? "" : " locked"}${stars > 0 ? " cleared" : ""}`);
      card.type = "button";
      card.append(element("span", "level-id", level.id));
      card.append(element("h3", "", level.title));
      card.append(element("p", "", level.description));
      const starLine = element("span", "level-stars");
      for (let index = 0; index < 3; index += 1) {
        const star = element("span", `star${index < stars ? " on" : ""}`, "★");
        starLine.append(star);
      }
      card.append(starLine);
      card.append(element("span", "level-mode", level.mode === "follow" ? "跟弹" : "节奏"));
      card.addEventListener("click", () => {
        if (!unlocked) {
          ctx.toast("先完成上一关。", "error");
          return;
        }
        ctx.navigate(`/game/${level.mode}/${level.songId}?level=${level.id}`);
      });
      grid.append(card);
    });
    body.append(grid);
  };

  root.append(tabs, body);
  render();
  return root;
}
