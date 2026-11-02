import { coverUrl } from "../assets";
import { applyResult, clearPendingResult, getPendingResult } from "../game/result";
import { ratingScore } from "../game/judge";
import { SONGS } from "../songs/data";
import { defaultRecordTitle, makeRecord } from "../recorder/recorder";
import type { AppContext } from "../ui/common";
import { element, promptDialog } from "../ui/dom";

export function resultView(ctx: AppContext): HTMLElement {
  const result = getPendingResult();
  if (!result) {
    const root = element("section", "placeholder-view");
    const card = element("div", "placeholder-card");
    card.append(
      element("p", "eyebrow", "RESULT"),
      element("h1", "", "还没有成绩"),
      element("p", "placeholder-copy", "完成一局后，这里会显示评级、分数和统计。"),
    );
    const back = element("button", "btn btn-primary", "回到首页");
    back.type = "button";
    back.addEventListener("click", () => ctx.navigate("/home"));
    card.append(back);
    root.append(card);
    return root;
  }

  const outcome = applyResult(ctx.profile, result);
  ctx.save();
  ctx.checkAchievements();
  void ctx.audio.playSfx("resultComplete", 0.55);

  const root = element("section", "result-view");
  const panel = element("div", "result-panel");

  const head = element("div", "result-head");
  const cover = element("img", "result-cover") as HTMLImageElement;
  cover.src = coverUrl(ctx.manifest, result.songId);
  cover.alt = "";
  const headText = element("div", "result-head-text");
  headText.append(
    element("p", "eyebrow", result.mode === "rhythm" ? "RHYTHM RESULT" : "FOLLOW RESULT"),
    element("h1", "", result.title),
    element("p", "result-meta", `${result.summary.total} 个音 · 准确率 ${(result.summary.accuracy * 100).toFixed(1)}%`),
  );
  head.append(cover, headText);
  if (outcome.newScore || outcome.newGrade) {
    head.append(element("span", "record-badge", outcome.newScore ? "新纪录" : "新评级"));
  }

  const grade = element("div", `result-grade grade-${result.summary.grade}`, result.summary.grade);
  const score = element("div", "result-score");
  score.append(
    element("span", "result-score-label", "得分"),
    element("b", "", result.summary.score.toLocaleString("zh-CN")),
  );
  const scoreRow = element("div", "result-score-row");
  scoreRow.append(grade, score);

  const stats = element("div", "result-stats");
  const statData = [
    ["准确率", `${(result.summary.accuracy * 100).toFixed(1)}%`],
    ["最大 Combo", String(result.summary.maxCombo)],
    ["综合分", `${ratingScore(result.summary).toFixed(1)}%`],
    ["PERFECT", String(result.summary.perfect)],
    ["GREAT", String(result.summary.great)],
    ["GOOD", String(result.summary.good)],
    ["MISS", String(result.summary.miss)],
  ];
  statData.forEach(([label, value]) => {
    const item = element("div", "result-stat");
    item.append(element("span", "", label), element("b", "", value));
    stats.append(item);
  });

  const actions = element("div", "result-actions");
  const retry = element("button", "btn btn-primary", "再来一次");
  retry.type = "button";
  retry.addEventListener("click", () => {
    clearPendingResult();
    ctx.navigate(`/game/${result.mode}/${result.songId}`);
  });
  const nextSong = SONGS[(SONGS.findIndex((song) => song.id === result.songId) + 1) % SONGS.length] ?? SONGS[0];
  const next = element("button", "btn btn-ghost", "下一首");
  next.type = "button";
  next.addEventListener("click", () => {
    clearPendingResult();
    if (nextSong) ctx.navigate(`/song/${nextSong.id}`);
    else ctx.navigate("/songs");
  });
  const home = element("button", "btn btn-ghost", "返回首页");
  home.type = "button";
  home.addEventListener("click", () => {
    clearPendingResult();
    ctx.navigate("/home");
  });
  const share = element("button", "btn btn-ghost", "分享");
  share.type = "button";
  share.addEventListener("click", () => ctx.navigate("/share"));
  const save = element("button", "btn btn-ghost", "保存演奏");
  save.type = "button";
  let saved = false;
  if (!result.record || result.record.events.length === 0) {
    save.disabled = true;
  }
  save.addEventListener("click", () => {
    void (async () => {
      if (saved || !result.record || result.record.events.length === 0) return;
      if (ctx.profile.records.length >= 20) {
        ctx.toast("最多保存 20 条演奏，请先删除旧作品。", "error");
        return;
      }
      const title = await promptDialog({
        title: "保存演奏",
        message: `${Math.round(result.record.duration / 1000)} 秒 · ${result.record.events.filter((event) => event.type === "down").length} 个音`,
        value: defaultRecordTitle(),
        confirmText: "保存",
      });
      if (!title) return;
      ctx.profile.records.unshift(makeRecord(result.record, title, result.source, result.songId));
      ctx.profile.records = ctx.profile.records.slice(0, 20);
      ctx.save();
      ctx.checkAchievements();
      saved = true;
      save.textContent = "已保存";
      save.disabled = true;
      ctx.toast("已保存到我的演奏", "success");
    })();
  });
  actions.append(share, save, retry, next, home);

  panel.append(head, scoreRow, stats, actions);
  root.append(panel);

  return root;
}
