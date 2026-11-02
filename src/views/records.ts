import { PerformancePlayer } from "../recorder/player";
import { Keyboard } from "../keyboard/keyboard";
import type { AppContext } from "../ui/common";
import { confirmDialog, element, formatDate, promptDialog } from "../ui/dom";
import type { PerformanceRecord } from "../types";

function duration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const SOURCE_LABEL: Record<PerformanceRecord["source"], string> = {
  free: "自由演奏",
  follow: "跟我弹",
  rhythm: "节奏挑战",
};

export function recordsView(ctx: AppContext): HTMLElement {
  const root = element("section", "records-view");
  const head = element("header", "view-head");
  const titleBox = element("div", "view-titlebox");
  titleBox.append(element("p", "eyebrow", "MY PERFORMANCE"), element("h1", "", "我的演奏"));
  const count = element("span", "view-summary", `${ctx.profile.records.length} / 20 条`);
  head.append(titleBox, count);
  root.append(head);

  const progress = element("div", "records-progress hidden");
  const progressBar = element("i");
  const progressTime = element("span", "", "00:00");
  progress.append(progressBar, progressTime);
  root.append(progress);

  const list = element("div", "record-list");
  const keyboardWrap = element("div", "records-keyboard");
  const keyboardMeta = element("div", "keyboard-meta");
  keyboardMeta.append(element("span", "", "回放时琴键会亮起"), element("span", "", "C4–E5 · 15 键"));
  const keyboard = new Keyboard({ labels: ctx.profile.settings.keyLabels });
  keyboard.setEnabled(false);
  keyboardWrap.append(keyboardMeta, keyboard.element);
  root.append(list, keyboardWrap);

  let player: PerformancePlayer | null = null;
  let playingId: string | null = null;

  function stopPlayback(): void {
    player?.stop();
    player = null;
    playingId = null;
    progress.classList.add("hidden");
    progressBar.style.width = "0%";
    progressTime.textContent = "00:00";
    keyboard.clearHighlight();
    renderList();
  }

  function play(record: PerformanceRecord): void {
    if (playingId === record.id) {
      stopPlayback();
      return;
    }
    player?.stop();
    playingId = record.id;
    progress.classList.remove("hidden");
    progressTime.textContent = `00:00 / ${duration(record.duration)}`;
    renderList();
    player = new PerformancePlayer(ctx.audio, record, {
      onDown: (note) => keyboard.highlightMany([note]),
      onUp: () => keyboard.clearHighlight(),
      onProgress: (elapsed, total) => {
        progressBar.style.width = `${Math.min(100, (elapsed / Math.max(1, total)) * 100)}%`;
        progressTime.textContent = `${duration(elapsed)} / ${duration(total)}`;
      },
      onEnd: () => {
        playingId = null;
        player = null;
        progress.classList.add("hidden");
        progressBar.style.width = "0%";
        keyboard.clearHighlight();
        renderList();
      },
    });
    player.play();
  }

  async function rename(record: PerformanceRecord): Promise<void> {
    const title = await promptDialog({
      title: "重命名演奏",
      value: record.title,
      confirmText: "保存",
      maxLength: 20,
    });
    if (!title) return;
    record.title = title;
    ctx.save();
    renderList();
  }

  async function remove(record: PerformanceRecord): Promise<void> {
    const confirmed = await confirmDialog({
      title: "删除这条演奏？",
      message: `“${record.title}”删除后无法恢复。`,
      confirmText: "删除",
      danger: true,
    });
    if (!confirmed) return;
    if (playingId === record.id) {
      player?.stop();
      player = null;
      playingId = null;
      progress.classList.add("hidden");
      keyboard.clearHighlight();
    }
    ctx.profile.records = ctx.profile.records.filter((item) => item.id !== record.id);
    ctx.save();
    renderList();
  }

  function renderList(): void {
    list.replaceChildren();
    count.textContent = `${ctx.profile.records.length} / 20 条`;
    if (ctx.profile.records.length === 0) {
      const empty = element("div", "records-empty");
      empty.append(
        element("p", "eyebrow", "EMPTY"),
        element("h2", "", "还没有作品"),
        element("p", "", "去自由演奏弹一段，点录制就能保存。"),
      );
      const go = element("button", "btn btn-primary", "去自由演奏");
      go.type = "button";
      go.addEventListener("click", () => ctx.navigate("/free"));
      empty.append(go);
      list.append(empty);
      return;
    }

    ctx.profile.records
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((record) => {
        const card = element("article", `record-card${playingId === record.id ? " playing" : ""}`);
        const playButton = element("button", "record-play", playingId === record.id ? "■" : "▶");
        playButton.type = "button";
        playButton.setAttribute("aria-label", playingId === record.id ? "停止" : "播放");
        playButton.addEventListener("click", () => play(record));
        const body = element("div", "record-body");
        const top = element("div", "record-top");
        top.append(element("strong", "", record.title));
        top.append(element("span", "record-source", SOURCE_LABEL[record.source]));
        body.append(
          top,
          element("p", "record-meta", `${formatDate(record.createdAt)} · ${duration(record.duration)} · ${record.events.filter((event) => event.type === "down").length} 个音`),
        );
        const actions = element("div", "record-actions");
        const renameButton = element("button", "record-action", "重命名");
        renameButton.type = "button";
        renameButton.addEventListener("click", () => void rename(record));
        const deleteButton = element("button", "record-action danger", "删除");
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => void remove(record));
        actions.append(renameButton, deleteButton);
        body.append(actions);
        card.append(playButton, body);
        list.append(card);
      });
  }

  ctx.onCleanup(() => {
    player?.stop(false);
    keyboard.destroy();
  });

  renderList();
  return root;
}
