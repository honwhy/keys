import { backgroundUrl, logoUrl, type AssetManifest } from "./assets";
import { AudioEngine } from "./audio/engine";
import { saveProfile } from "./storage/profile";
import { achievementById, checkAchievements as collectAchievements, recordNoteForAchievements, unlockAchievement as unlockAchievementById } from "./achievements/achievements";
import type { Profile } from "./types";
import { confirmDialog, element, showToast } from "./ui/dom";
import type { AppContext } from "./ui/common";
import { notFoundView } from "./ui/common";
import { homeView } from "./views/home";
import { settingsView } from "./views/settings";
import { songDetailView, songbookView } from "./views/songbook";
import { rhythmView } from "./views/rhythm";
import { followView } from "./views/follow";
import { freeView } from "./views/free";
import { recordsView } from "./views/records";
import { achievementsView } from "./views/achievements";
import { dailyView } from "./views/daily";
import { enterFullscreen } from "./pwa";
import { levelsView } from "./views/levels";
import { shareView } from "./views/share";
import { resultView } from "./views/result";
import { getSong } from "./songs/data";

const NAV = [
  { path: "/home", label: "首页", match: ["home"] },
  { path: "/songs", label: "曲库", match: ["songs"] },
  { path: "/records", label: "我的演奏", match: ["records"] },
  { path: "/achievements", label: "成就", match: ["achievements"] },
];

function parseRoute(): string {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const path = hash.split("?")[0]?.trim() ?? "";
  return path || "home";
}

export class App implements AppContext {
  readonly profile: Profile;
  readonly manifest: AssetManifest;
  readonly audio: AudioEngine;
  private readonly root: HTMLElement;
  private readonly view: HTMLElement;
  private readonly nav: HTMLElement;
  private readonly dailyLabel: HTMLElement;
  private cleanups: Array<() => void> = [];

  constructor(root: HTMLElement, profile: Profile, manifest: AssetManifest) {
    this.root = root;
    this.profile = profile;
    this.manifest = manifest;
    this.audio = new AudioEngine(manifest, profile.settings);

    document.documentElement.style.setProperty("--app-bg", `url("${backgroundUrl(manifest)}")`);
    document.documentElement.dataset.reducedMotion = String(profile.settings.reducedMotion);

    const app = element("div", "app");
    const topbar = element("header", "topbar");
    const brand = element("a", "brand");
    brand.href = "#/home";
    brand.setAttribute("aria-label", "KeyTune 首页");
    const logo = element("img", "logo") as HTMLImageElement;
    logo.src = logoUrl(manifest);
    logo.alt = "KeyTune 键音";
    brand.append(logo);

    const nav = element("nav", "nav");
    nav.setAttribute("aria-label", "主导航");
    NAV.forEach((item) => {
      const link = element("a", "nav-link", item.label);
      link.href = `#${item.path}`;
      link.dataset.match = item.match[0];
      nav.append(link);
    });
    this.nav = nav;

    const actions = element("div", "top-actions");
    const daily = element("a", "daily");
    daily.href = "#/daily";
    daily.innerHTML = '今日挑战 <b>小星星</b>';
    this.dailyLabel = daily;
    const fullscreen = element("button", "icon-btn", "⛶");
    fullscreen.type = "button";
    fullscreen.setAttribute("aria-label", "全屏模式");
    fullscreen.title = "全屏模式";
    fullscreen.addEventListener("click", () => {
      void (async () => {
        const result = await enterFullscreen();
        if (result === "ios-install") {
          await confirmDialog({
            title: "全屏游玩",
            message:
              "Safari 不能直接隐藏地址栏。点击底部分享按钮 → 添加到主屏幕，之后从主屏幕打开 KeyTune，就会以全屏游戏模式启动。",
            confirmText: "知道了",
            cancelText: "继续浏览器",
          });
        } else if (result === "unsupported") {
          this.toast("当前浏览器不支持全屏，请添加到主屏幕。", "default");
        } else if (result === "entered") {
          this.toast("已进入全屏", "success");
        } else {
          this.toast("已经在全屏模式", "default");
        }
      })();
    });
    const settings = element("a", "icon-btn");
    settings.href = "#/settings";
    settings.setAttribute("aria-label", "设置");
    settings.textContent = "⚙";
    actions.append(daily, fullscreen, settings);

    topbar.append(brand, nav, actions);

    const view = element("main", "view");
    this.view = view;
    const toast = element("div", "toast");
    toast.id = "toast";
    const modal = element("div", "modal-root");
    modal.id = "modal-root";

    app.append(topbar, view, toast, modal);
    app.addEventListener("click", (event) => {
      const target = event.target instanceof HTMLElement ? event.target.closest("button, a") : null;
      if (target && !target.classList.contains("piano-key")) {
        void this.audio.playSfx("uiTap", 0.3);
      }
    });
    this.root.replaceChildren(app);

    window.addEventListener("hashchange", () => this.render());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.audio.stopAll();
      }
    });
    this.render();
  }

  navigate(path: string): void {
    const next = `#${path.startsWith("/") ? path : `/${path}`}`;
    if (window.location.hash === next) {
      this.render();
      return;
    }
    window.location.hash = next;
  }

  save(): void {
    this.audio.updateSettings(this.profile.settings);
    if (!saveProfile(this.profile)) {
      this.toast("无法保存进度，请检查浏览器存储空间。", "error");
    }
  }

  toast(message: string, tone: "default" | "success" | "error" = "default"): void {
    showToast(message, tone);
  }

  confirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
  }): Promise<boolean> {
    return confirmDialog(options);
  }

  onCleanup(callback: () => void): void {
    this.cleanups.push(callback);
  }

  trackNote(note: string): void {
    const unlocked = recordNoteForAchievements(this.profile, note);
    this.save();
    this.notifyAchievements(unlocked);
  }

  unlockAchievement(id: string): void {
    if (unlockAchievementById(this.profile, id)) {
      this.save();
      const achievement = achievementById(id);
      if (achievement) {
        this.notifyAchievements([achievement]);
      }
    }
  }

  checkAchievements(): void {
    const unlocked = collectAchievements(this.profile);
    if (unlocked.length > 0) {
      this.save();
      this.notifyAchievements(unlocked);
    }
  }

  private notifyAchievements(unlocked: Array<{ id: string; name: string }>): void {
    unlocked.forEach((achievement, index) => {
      window.setTimeout(() => this.toast(`成就解锁 · ${achievement.name}`, "success"), index * 700);
    });
  }

  render(): void {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
    this.audio.stopAll();
    const route = parseRoute();
    this.root.dataset.route = route;

    this.nav.querySelectorAll<HTMLAnchorElement>(".nav-link").forEach((link) => {
      const match = link.dataset.match ?? "";
      const active =
        match === route ||
        (match === "songs" && (route.startsWith("song/") || route.startsWith("game/"))) ||
        (match === "home" && route === "home");
      link.classList.toggle("active", active);
    });

    let view: HTMLElement;
    if (route.startsWith("song/")) {
      const songId = route.slice("song/".length);
      view = getSong(songId) ? songDetailView(this, songId) : notFoundView(this);
    } else if (route.startsWith("game/rhythm/")) {
      const songId = route.slice("game/rhythm/".length);
      view = rhythmView(this, songId);
    } else if (route.startsWith("game/follow/")) {
      const songId = route.slice("game/follow/".length);
      view = followView(this, songId);
    } else if (route === "result") {
      view = resultView(this);
    } else if (route === "share") {
      view = shareView(this);
    } else {
      switch (route) {
        case "home":
          view = homeView(this);
          break;
        case "settings":
          view = settingsView(this);
          break;
        case "songs":
          view = songbookView(this);
          break;
        case "records":
          view = recordsView(this);
          break;
        case "achievements":
          view = achievementsView(this);
          break;
        case "daily":
          view = dailyView(this);
          break;
        case "levels":
          view = levelsView(this);
          break;
        case "free":
          view = freeView(this);
          break;
        default:
          view = notFoundView(this);
          break;
      }
    }

    this.view.replaceChildren(view);
    document.title = route === "home" ? "KeyTune · 键音" : `${routeTitle(route)} · KeyTune`;
    const dailySong = this.profile.daily ? getSong(this.profile.daily.songId) : null;
    this.dailyLabel.innerHTML = `今日挑战 <b>${dailySong?.title ?? "小星星"}</b>`;
  }
}

function routeTitle(route: string): string {
  if (route === "settings") return "设置";
  if (route === "songs") return "曲库";
  if (route === "records") return "我的演奏";
  if (route === "achievements") return "成就";
  if (route === "daily") return "每日挑战";
  if (route === "levels") return "闯关";
  if (route === "free") return "自由演奏";
  if (route === "result") return "结算";
  if (route === "share") return "分享";
  if (route.startsWith("game/")) return "演奏";
  return "页面";
}
