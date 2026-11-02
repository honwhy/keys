export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

export function clearChildren(node: HTMLElement): void {
  node.replaceChildren();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

let toastTimer: number | undefined;

export function showToast(message: string, tone: "default" | "success" | "error" = "default"): void {
  const root = document.querySelector<HTMLDivElement>("#toast");
  if (!root) {
    return;
  }
  root.textContent = message;
  root.dataset.tone = tone;
  root.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    root.classList.remove("show");
  }, 2200);
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const root = document.querySelector<HTMLDivElement>("#modal-root");
    if (!root) {
      resolve(false);
      return;
    }

    const backdrop = element("div", "modal-backdrop");
    const panel = element("div", "modal-panel");
    const title = element("h2", "modal-title", options.title);
    const message = element("p", "modal-message", options.message);
    const actions = element("div", "modal-actions");
    const cancel = element("button", "btn btn-ghost", options.cancelText ?? "取消");
    const confirm = element(
      "button",
      `btn ${options.danger ? "btn-danger" : "btn-primary"}`,
      options.confirmText ?? "确定",
    );

    cancel.type = "button";
    confirm.type = "button";
    actions.append(cancel, confirm);
    panel.append(title, message, actions);
    backdrop.append(panel);
    root.append(backdrop);

    const close = (result: boolean) => {
      backdrop.remove();
      document.removeEventListener("keydown", onKeyDown);
      resolve(result);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close(false);
      }
    };

    cancel.addEventListener("click", () => close(false));
    confirm.addEventListener("click", () => close(true));
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        close(false);
      }
    });
    document.addEventListener("keydown", onKeyDown);
    cancel.focus();
  });
}

export interface PromptOptions {
  title: string;
  message?: string;
  value?: string;
  placeholder?: string;
  confirmText?: string;
  maxLength?: number;
}

export function promptDialog(options: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const root = document.querySelector<HTMLDivElement>("#modal-root");
    if (!root) {
      resolve(null);
      return;
    }
    const backdrop = element("div", "modal-backdrop");
    const panel = element("div", "modal-panel");
    const title = element("h2", "modal-title", options.title);
    const message = element("p", "modal-message", options.message ?? "");
    const input = element("input", "prompt-input") as HTMLInputElement;
    input.type = "text";
    input.value = options.value ?? "";
    input.placeholder = options.placeholder ?? "";
    input.maxLength = options.maxLength ?? 20;
    const actions = element("div", "modal-actions");
    const cancel = element("button", "btn btn-ghost", "取消");
    const confirm = element("button", "btn btn-primary", options.confirmText ?? "保存");
    cancel.type = "button";
    confirm.type = "button";
    const sync = () => {
      confirm.disabled = input.value.trim().length === 0;
    };
    input.addEventListener("input", sync);
    sync();
    actions.append(cancel, confirm);
    panel.append(title, message, input, actions);
    backdrop.append(panel);
    root.append(backdrop);

    const close = (value: string | null) => {
      backdrop.remove();
      document.removeEventListener("keydown", onKeyDown);
      resolve(value);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(null);
      if (event.key === "Enter" && input.value.trim()) close(input.value.trim());
    };
    cancel.addEventListener("click", () => close(null));
    confirm.addEventListener("click", () => {
      if (input.value.trim()) close(input.value.trim());
    });
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close(null);
    });
    document.addEventListener("keydown", onKeyDown);
    input.focus();
    input.select();
  });
}
