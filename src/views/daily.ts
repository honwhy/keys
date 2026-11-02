import { coverUrl } from "../assets";
import { ensureDaily, todayKey } from "../daily/daily";
import { getSong } from "../songs/data";
import type { AppContext } from "../ui/common";
import { element } from "../ui/dom";

export function dailyView(ctx: AppContext): HTMLElement {
  const { daily, changed } = ensureDaily(ctx.profile);
  if (changed) ctx.save();
  const song = getSong(daily.songId) ?? getSong("twinkle");

  const root = element("section", "daily-view");
  const head = element("header", "view-head");
  const titleBox = element("div", "view-titlebox");
  titleBox.append(element("p", "eyebrow", "DAILY CHALLENGE"), element("h1", "", "每日挑战"));
  const streak = element("span", "daily-streak", `🔥 连续 ${daily.streak} 天`);
  head.append(titleBox, streak);
  root.append(head);

  const card = element("div", "daily-card");
  const cover = element("img", "daily-cover") as HTMLImageElement;
  cover.src = coverUrl(ctx.manifest, song?.id ?? "twinkle");
  cover.alt = "";
  const info = element("div", "daily-info");
  info.append(
    element("p", "eyebrow", todayKey()),
    element("h2", "", song?.title ?? "小星星"),
    element("p", "daily-meta", `${song?.category ?? "入门"} · Lv${song?.difficulty ?? 2} · ${song?.bpm ?? 100} BPM`),
    element("p", "daily-best", `今日最佳：${daily.bestScore > 0 ? daily.bestScore.toLocaleString("zh-CN") : "—"} · ${daily.bestGrade ?? "—"}`),
    element("p", "daily-hint", "无限次挑战，只取今日最高分；跨天 00:00 刷新。"),
  );
  const start = element("button", "btn btn-primary", "开始挑战");
  start.type = "button";
  start.addEventListener("click", () => {
    if (song) ctx.navigate(`/game/rhythm/${song.id}?daily=1`);
    else ctx.navigate("/songs");
  });
  info.append(start);

  const calendar = element("div", "daily-calendar");
  for (let index = 6; index >= 0; index -= 1) {
    const day = element("span", "daily-day");
    day.textContent = index === 0 ? "今天" : `${index} 天前`;
    if (index === 0) day.classList.add("today");
    calendar.append(day);
  }
  card.append(cover, info, calendar);
  root.append(card);
  return root;
}
