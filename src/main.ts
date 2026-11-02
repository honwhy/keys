import "./styles.css";
import { loadManifest } from "./assets";
import { App } from "./app";
import { loadProfile } from "./storage/profile";

const rootElement = document.querySelector<HTMLDivElement>("#app");

if (!rootElement) {
  throw new Error("Missing #app root");
}

const root = rootElement;

async function boot(): Promise<void> {
  try {
    const manifest = await loadManifest();
    const { profile, warning } = loadProfile();
    const app = new App(root, profile, manifest);
    if (warning) {
      window.setTimeout(() => app.toast(warning, "error"), 700);
    }
  } catch (error) {
    console.error("KeyTune boot failed", error);
    root.innerHTML = `
      <div class="boot-error">
        <h1>KeyTune 加载失败</h1>
        <p>无法读取素材清单，请刷新后重试。</p>
        <button type="button" onclick="location.reload()">重新加载</button>
      </div>
    `;
  }
}

void boot();
