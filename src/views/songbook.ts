import { coverUrl } from "../assets";
import type { AppContext } from "../ui/common";
import { element } from "../ui/dom";
import { getSong, SONGS, starsForDifficulty } from "../songs/data";
import type { Song } from "../types";

const CATEGORIES = ["全部", "入门", "初级", "中级", "和弦"] as const;
type Category = (typeof CATEGORIES)[number];

function bestFor(ctx: AppContext, song: Song) {
  return ctx.profile.bestScores[`${song.id}:rhythm`] ?? ctx.profile.bestScores[`${song.id}:follow`];
}

function stars(count: number): string {
  return "★".repeat(count) + "☆".repeat(5 - count);
}

export function songbookView(ctx: AppContext): HTMLElement {
  const root = element("section", "songbook-view");
  const head = element("header", "view-head");
  const titleBox = element("div", "view-titlebox");
  titleBox.append(element("p", "eyebrow", "SONG LIBRARY"), element("h1", "", "曲库"));
  const summary = element("span", "view-summary", "6 首 · 全部开放");
  head.append(titleBox, summary);
  root.append(head);

  const tabs = element("div", "category-tabs");
  const grid = element("div", "song-grid");
  let current: Category = "全部";

  const renderGrid = (): void => {
    grid.replaceChildren();
    const list = current === "全部" ? SONGS : SONGS.filter((song) => song.category === current);
    if (list.length === 0) {
      grid.append(element("p", "empty-copy", "这个分类还没有曲目。"));
      return;
    }
    list.forEach((song) => {
      const best = bestFor(ctx, song);
      const card = element("button", "song-card");
      card.type = "button";
      const cover = element("img", "song-cover") as HTMLImageElement;
      cover.src = coverUrl(ctx.manifest, song.id);
      cover.alt = `${song.title}封面`;
      const body = element("div", "song-card-body");
      const top = element("div", "song-card-top");
      top.append(element("span", "song-title", song.title));
      top.append(element("span", "song-grade", best?.bestGrade ?? "—"));
      body.append(
        top,
        element("p", "song-meta", `${song.category} · Lv${song.difficulty} · ${song.bpm} BPM`),
        element("span", "song-stars", stars(starsForDifficulty(song.difficulty))),
        element("span", "song-best", best?.bestScore ? `${best.bestScore.toLocaleString("zh-CN")} 分` : "未游玩"),
      );
      card.append(cover, body);
      card.addEventListener("click", () => ctx.navigate(`/song/${song.id}`));
      grid.append(card);
    });
  };

  CATEGORIES.forEach((category) => {
    const tab = element("button", "category-tab", category);
    tab.type = "button";
    if (category === current) tab.classList.add("active");
    tab.addEventListener("click", () => {
      current = category;
      tabs.querySelectorAll(".category-tab").forEach((node) => node.classList.remove("active"));
      tab.classList.add("active");
      renderGrid();
    });
    tabs.append(tab);
  });

  root.append(tabs, grid);
  renderGrid();
  return root;
}

export function songDetailView(ctx: AppContext, songId: string): HTMLElement {
  const song = getSong(songId);
  if (!song) {
    return element("section", "placeholder-view");
  }

  const root = element("section", "song-detail-view");
  const head = element("header", "view-head");
  const back = element("button", "back-btn", "←");
  back.type = "button";
  back.setAttribute("aria-label", "返回曲库");
  back.addEventListener("click", () => ctx.navigate("/songs"));
  head.append(back, element("p", "eyebrow", "SONG DETAIL"));
  root.append(head);

  const card = element("div", "song-detail-card");
  const cover = element("img", "song-detail-cover") as HTMLImageElement;
  cover.src = coverUrl(ctx.manifest, song.id);
  cover.alt = `${song.title}封面`;

  const info = element("div", "song-detail-info");
  info.append(
    element("p", "eyebrow", song.category),
    element("h1", "", song.title),
    element("p", "song-detail-sub", `${song.titleEn ?? ""} · Lv${song.difficulty} · ${song.bpm} BPM · ${Math.round(song.duration / 1000)} 秒`),
    element("p", "song-detail-keys", `用键：${song.focusKeys?.join(" · ") ?? "C4 – E5"}`),
    element("p", "song-detail-stars", stars(starsForDifficulty(song.difficulty))),
  );

  const best = ctx.profile.bestScores[`${song.id}:rhythm`];
  const followBest = ctx.profile.bestScores[`${song.id}:follow`];
  const bestLine = element("p", "song-detail-best");
  bestLine.innerHTML = `最佳：<b>${best?.bestGrade ?? followBest?.bestGrade ?? "—"}</b> · ${best?.bestScore ? best.bestScore.toLocaleString("zh-CN") : "—"} 分`;
  info.append(bestLine);

  const actions = element("div", "song-detail-actions");
  const follow = element("button", "btn btn-ghost", "跟弹");
  follow.type = "button";
  follow.addEventListener("click", () => ctx.navigate(`/game/follow/${song.id}`));
  const rhythm = element("button", "btn btn-primary", "节奏挑战");
  rhythm.type = "button";
  rhythm.addEventListener("click", () => ctx.navigate(`/game/rhythm/${song.id}`));
  actions.append(follow, rhythm);
  info.append(actions);

  card.append(cover, info);
  root.append(card);
  return root;
}
