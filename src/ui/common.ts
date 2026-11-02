import type { AssetManifest } from "../assets";
import type { AudioEngine } from "../audio/engine";
import type { Profile } from "../types";
import { element } from "./dom";

export interface AppContext {
  profile: Profile;
  manifest: AssetManifest;
  audio: AudioEngine;
  navigate(path: string): void;
  save(): void;
  toast(message: string, tone?: "default" | "success" | "error"): void;
  confirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
  }): Promise<boolean>;
  onCleanup(callback: () => void): void;
  trackNote(note: string): void;
  unlockAchievement(id: string): void;
  checkAchievements(): void;
  render(): void;
}

export type View = (ctx: AppContext) => HTMLElement;

export interface PlaceholderOptions {
  eyebrow: string;
  title: string;
  message: string;
  feature: string;
}

export function placeholderView(_ctx: AppContext, options: PlaceholderOptions): HTMLElement {
  const root = element("section", "placeholder-view");
  const card = element("div", "placeholder-card");
  card.append(
    element("p", "eyebrow", options.eyebrow),
    element("h1", "", options.title),
    element("p", "placeholder-copy", options.message),
    element("span", "phase-pill", options.feature),
  );
  root.append(card);
  return root;
}

export function notFoundView(ctx: AppContext): HTMLElement {
  const root = element("section", "placeholder-view");
  const card = element("div", "placeholder-card");
  const title = element("h1", "", "页面走丢了");
  const copy = element("p", "placeholder-copy", "这个地址没有对应的页面。");
  const back = element("button", "btn btn-primary", "回到首页");
  back.type = "button";
  back.addEventListener("click", () => ctx.navigate("/home"));
  card.append(element("p", "eyebrow", "404"), title, copy, back);
  root.append(card);
  return root;
}
