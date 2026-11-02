import { ACHIEVEMENTS } from "../achievements/achievements";
import type { AppContext } from "../ui/common";
import { element } from "../ui/dom";

export function achievementsView(ctx: AppContext): HTMLElement {
  const root = element("section", "achievements-view");
  const head = element("header", "view-head");
  const titleBox = element("div", "view-titlebox");
  titleBox.append(element("p", "eyebrow", "ACHIEVEMENTS"), element("h1", "", "成就"));
  const unlocked = Object.keys(ctx.profile.achievements.unlocked).length;
  head.append(titleBox, element("span", "view-summary", `${unlocked} / ${ACHIEVEMENTS.length} 已解锁`));
  root.append(head);

  const grid = element("div", "achievement-grid");
  ACHIEVEMENTS.forEach((achievement) => {
    const doneAt = ctx.profile.achievements.unlocked[achievement.id];
    const current = Math.min(achievement.target, achievement.progress(ctx.profile));
    const card = element("article", `achievement-card${doneAt ? " unlocked" : " locked"}`);
    const icon = element("div", "achievement-icon", achievement.icon);
    const body = element("div", "achievement-body");
    body.append(
      element("span", "achievement-category", achievement.category),
      element("h2", "", achievement.name),
      element("p", "", achievement.description),
    );
    if (doneAt) {
      body.append(element("span", "achievement-date", new Date(doneAt).toLocaleDateString("zh-CN")));
    } else {
      const progress = element("div", "achievement-progress");
      const bar = element("i");
      bar.style.width = `${(current / achievement.target) * 100}%`;
      progress.append(bar);
      body.append(progress, element("span", "achievement-count", `${current} / ${achievement.target}`));
    }
    card.append(icon, body);
    grid.append(card);
  });

  root.append(grid);
  return root;
}
