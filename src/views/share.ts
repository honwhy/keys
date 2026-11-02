import { coverUrl } from "../assets";
import { getPendingResult } from "../game/result";
import type { AppContext } from "../ui/common";
import { element } from "../ui/dom";

function drawCard(ctx: CanvasRenderingContext2D, cover: HTMLImageElement, data: {
  title: string;
  grade: string;
  score: number;
  accuracy: number;
  combo: number;
}): void {
  const width = 1080;
  const height = 1920;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#0B0E17");
  gradient.addColorStop(0.55, "#111827");
  gradient.addColorStop(1, "#071018");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(720, 260, 20, 720, 260, 520);
  glow.addColorStop(0, "rgba(53,224,208,.22)");
  glow.addColorStop(1, "rgba(53,224,208,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#F5F7FF";
  ctx.font = "700 54px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("KeyTune", 90, 130);
  ctx.fillStyle = "#8A93B2";
  ctx.font = "400 28px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("键音 · Play by Keys", 90, 176);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(90, 270, 900, 760, 40);
  ctx.clip();
  ctx.drawImage(cover, 90, 270, 900, 760);
  ctx.restore();

  ctx.fillStyle = "rgba(8,11,19,.55)";
  ctx.fillRect(90, 760, 900, 270);
  ctx.fillStyle = "#F5F7FF";
  ctx.font = "700 58px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(data.title, 130, 850);
  ctx.fillStyle = "#8A93B2";
  ctx.font = "400 26px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("我的演奏 · KeyTune", 130, 900);

  ctx.fillStyle = "#FFC857";
  ctx.font = "800 210px 'SF Pro Display', 'Microsoft YaHei', sans-serif";
  ctx.fillText(data.grade, 90, 1280);

  ctx.fillStyle = "#F5F7FF";
  ctx.font = "700 70px 'SF Pro Display', 'Microsoft YaHei', sans-serif";
  ctx.fillText(data.score.toLocaleString("zh-CN"), 360, 1190);
  ctx.fillStyle = "#8A93B2";
  ctx.font = "400 24px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("SCORE", 364, 1230);

  const stats = [
    ["准确率", `${(data.accuracy * 100).toFixed(1)}%`],
    ["最大 Combo", String(data.combo)],
  ];
  stats.forEach(([label, value], index) => {
    const x = 90 + index * 450;
    ctx.fillStyle = "#8A93B2";
    ctx.font = "400 26px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText(label, x, 1400);
    ctx.fillStyle = "#F5F7FF";
    ctx.font = "700 52px 'SF Pro Display', 'Microsoft YaHei', sans-serif";
    ctx.fillText(value, x, 1470);
  });

  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(90, 1580, 900, 2);
  ctx.fillStyle = "#8A93B2";
  ctx.font = "400 24px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(new Date().toLocaleDateString("zh-CN"), 90, 1650);
  ctx.fillStyle = "#35E0D0";
  ctx.font = "600 26px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("keytune.app", 760, 1650);
}

export function shareView(ctx: AppContext): HTMLElement {
  const result = getPendingResult();
  const root = element("section", "share-view");
  if (!result) {
    const card = element("div", "placeholder-card");
    card.append(element("p", "eyebrow", "SHARE"), element("h1", "", "没有可分享的成绩"), element("p", "placeholder-copy", "完成一局后再来生成卡片。"));
    const back = element("button", "btn btn-primary", "回到首页");
    back.type = "button";
    back.addEventListener("click", () => ctx.navigate("/home"));
    card.append(back);
    root.append(card);
    return root;
  }

  const head = element("header", "view-head");
  const back = element("button", "back-btn", "←");
  back.type = "button";
  back.addEventListener("click", () => history.back());
  const titleBox = element("div", "view-titlebox");
  titleBox.append(element("p", "eyebrow", "SHARE"), element("h1", "", "分享成绩"));
  head.append(back, titleBox);
  root.append(head);

  const body = element("div", "share-body");
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  canvas.className = "share-canvas";
  const canvasContext = canvas.getContext("2d");
  body.append(canvas);

  const controls = element("div", "share-controls");
  const save = element("button", "btn btn-primary", "保存图片");
  save.type = "button";
  const systemShare = element("button", "btn btn-ghost", "系统分享");
  systemShare.type = "button";
  controls.append(save, systemShare);
  body.append(controls);
  root.append(body);

  const cover = new Image();
  cover.src = coverUrl(ctx.manifest, result.songId, "512");
  cover.onload = () => {
    if (canvasContext) {
      drawCard(canvasContext, cover, {
        title: result.title,
        grade: result.summary.grade,
        score: result.summary.score,
        accuracy: result.summary.accuracy,
        combo: result.summary.maxCombo,
      });
    }
  };

  const toBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));

  save.addEventListener("click", () => {
    void (async () => {
      const blob = await toBlob();
      if (!blob) {
        ctx.toast("生成图片失败，请重试。", "error");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `keytune-${result.songId}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      ctx.toast("已保存分享卡片", "success");
    })();
  });

  systemShare.addEventListener("click", () => {
    void (async () => {
      const blob = await toBlob();
      if (!blob) {
        ctx.toast("生成图片失败，请重试。", "error");
        return;
      }
      const file = new File([blob], `keytune-${result.songId}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "KeyTune 我的演奏" });
      } else {
        ctx.toast("当前浏览器不支持系统分享，请保存图片。", "default");
      }
    })();
  });

  return root;
}
