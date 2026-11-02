import { element } from "../ui/dom";

const WHITE = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"];
const BLACK = [
  { note: "C#4", after: 0 },
  { note: "D#4", after: 1 },
  { note: "F#4", after: 3 },
  { note: "G#4", after: 4 },
  { note: "A#4", after: 5 },
];
const LABEL: Record<string, string> = {
  "C#4": "C♯",
  "D#4": "D♯",
  "F#4": "F♯",
  "G#4": "G♯",
  "A#4": "A♯",
};
const KEYMAP: Record<string, string> = {
  a: "C4",
  s: "D4",
  d: "E4",
  f: "F4",
  g: "G4",
  h: "A4",
  j: "B4",
  k: "C5",
  l: "D5",
  ";": "E5",
  w: "C#4",
  e: "D#4",
  t: "F#4",
  y: "G#4",
  u: "A#4",
};

export interface KeyboardOptions {
  labels?: boolean;
  onDown?: (note: string, time: number) => void;
  onUp?: (note: string, time: number) => void;
}

export class Keyboard {
  readonly element: HTMLElement;
  private readonly keyElements = new Map<string, HTMLElement>();
  private readonly pointerNotes = new Map<number, string>();
  private readonly notePressCounts = new Map<string, number>();
  private readonly physicalKeys = new Set<string>();
  private readonly options: KeyboardOptions;
  private labelsVisible: boolean;
  private enabled = true;

  constructor(options: KeyboardOptions = {}) {
    this.options = options;
    this.labelsVisible = options.labels !== false;
    this.element = element("div", "keyboard-preview interactive");
    this.build();
    this.bindEvents();
    this.setLabelsVisible(this.labelsVisible);
  }

  private build(): void {
    const whiteRow = element("div", "white-row");
    WHITE.forEach((note) => {
      const key = element("button", "white-key piano-key");
      key.type = "button";
      key.dataset.note = note;
      key.setAttribute("aria-label", note);
      key.append(element("span", "key-label", note.replace(/\d/, "")));
      whiteRow.append(key);
      this.keyElements.set(note, key);
    });
    this.element.append(whiteRow);

    BLACK.forEach((item) => {
      const key = element("button", "black-key piano-key");
      key.type = "button";
      key.dataset.note = item.note;
      key.setAttribute("aria-label", item.note);
      key.style.left = `calc(${(item.after + 1) * 10}% + 5px - 3.1%)`;
      key.append(element("span", "key-label", LABEL[item.note] ?? item.note));
      this.element.append(key);
      this.keyElements.set(item.note, key);
    });
  }

  private bindEvents(): void {
    this.element.addEventListener("pointerdown", this.pointerDown);
    this.element.addEventListener("pointermove", this.pointerMove);
    this.element.addEventListener("pointerup", this.pointerUp);
    this.element.addEventListener("pointercancel", this.pointerUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  private keyAtPoint(clientX: number, clientY: number): HTMLElement | null {
    const node = document.elementFromPoint(clientX, clientY);
    return node instanceof HTMLElement ? node.closest<HTMLElement>(".piano-key") : null;
  }

  private pointerDown = (event: PointerEvent): void => {
    if (!this.enabled) {
      return;
    }
    const key = (event.target as HTMLElement).closest<HTMLElement>(".piano-key");
    if (!key?.dataset.note) {
      return;
    }
    event.preventDefault();
    const note = key.dataset.note;
    this.pointerNotes.set(event.pointerId, note);
    this.press(note, performance.now());
    try {
      this.element.setPointerCapture(event.pointerId);
    } catch {
      // Safari may reject capture after preventDefault.
    }
  };

  private pointerMove = (event: PointerEvent): void => {
    if (!this.enabled || !this.pointerNotes.has(event.pointerId)) {
      return;
    }
    if ((event.buttons & 1) === 0 && event.pointerType === "mouse") {
      this.endPointer(event.pointerId);
      return;
    }
    const key = this.keyAtPoint(event.clientX, event.clientY);
    const next = key?.dataset.note;
    const previous = this.pointerNotes.get(event.pointerId);
    if (!next) {
      if (previous) {
        this.release(previous, performance.now());
        this.pointerNotes.delete(event.pointerId);
      }
      return;
    }
    if (next !== previous) {
      if (previous) {
        this.release(previous, performance.now());
      }
      this.pointerNotes.set(event.pointerId, next);
      this.press(next, performance.now());
    }
  };

  private pointerUp = (event: PointerEvent): void => {
    this.endPointer(event.pointerId);
  };

  private endPointer(pointerId: number): void {
    const note = this.pointerNotes.get(pointerId);
    if (!note) {
      return;
    }
    this.pointerNotes.delete(pointerId);
    this.release(note, performance.now());
  }

  private onBlur = (): void => {
    this.releaseAll(performance.now());
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.releaseAll(performance.now());
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled || event.repeat || this.isEditableTarget(event.target)) {
      return;
    }
    const note = KEYMAP[event.key.toLowerCase()];
    if (!note || this.physicalKeys.has(note)) {
      return;
    }
    event.preventDefault();
    this.physicalKeys.add(note);
    this.press(note, performance.now());
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (this.isEditableTarget(event.target)) {
      return;
    }
    const note = KEYMAP[event.key.toLowerCase()];
    if (!note) {
      return;
    }
    event.preventDefault();
    this.physicalKeys.delete(note);
    this.release(note, performance.now());
  };

  private press(note: string, time: number): void {
    const count = this.notePressCounts.get(note) ?? 0;
    this.notePressCounts.set(note, count + 1);
    if (count > 0) {
      return;
    }
    const key = this.keyElements.get(note);
    key?.classList.add("pressed");
    this.options.onDown?.(note, time);
  }

  private release(note: string, time: number): void {
    const count = this.notePressCounts.get(note) ?? 0;
    if (count <= 1) {
      this.notePressCounts.delete(note);
      this.keyElements.get(note)?.classList.remove("pressed");
      this.options.onUp?.(note, time);
      return;
    }
    this.notePressCounts.set(note, count - 1);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.element.classList.toggle("disabled", !enabled);
    if (!enabled) {
      this.releaseAll(performance.now());
    }
  }

  releaseAll(time = performance.now()): void {
    for (const note of [...this.notePressCounts.keys()]) {
      this.notePressCounts.delete(note);
      this.keyElements.get(note)?.classList.remove("pressed");
      this.options.onUp?.(note, time);
    }
    this.pointerNotes.clear();
    this.physicalKeys.clear();
  }

  setLabelsVisible(visible: boolean): void {
    this.labelsVisible = visible;
    this.element.classList.toggle("hide-labels", !visible);
  }

  setLabels(visible: boolean): void {
    this.setLabelsVisible(visible);
  }

  highlight(note: string | null): void {
    this.keyElements.forEach((key, current) => {
      key.classList.toggle("target", current === note);
    });
  }

  highlightMany(notes: string[]): void {
    const targets = new Set(notes);
    this.keyElements.forEach((key, current) => {
      key.classList.toggle("target", targets.has(current));
    });
  }

  clearHighlight(): void {
    this.keyElements.forEach((key) => key.classList.remove("target"));
  }

  setFocus(notes: string[] | null): void {
    const focused = notes ? new Set(notes) : null;
    this.keyElements.forEach((key, note) => {
      key.classList.toggle("dimmed", focused !== null && !focused.has(note));
      key.classList.toggle("focused", focused !== null && focused.has(note));
    });
  }

  destroy(): void {
    this.releaseAll();
    this.element.removeEventListener("pointerdown", this.pointerDown);
    this.element.removeEventListener("pointermove", this.pointerMove);
    this.element.removeEventListener("pointerup", this.pointerUp);
    this.element.removeEventListener("pointercancel", this.pointerUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }
}
