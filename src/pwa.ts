export type FullscreenResult = "already" | "entered" | "ios-install" | "unsupported";

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function isIos(): boolean {
  const nav = navigator as Navigator & { maxTouchPoints?: number };
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1)
  );
}

export async function enterFullscreen(): Promise<FullscreenResult> {
  if (isStandalone()) {
    return "already";
  }
  const root = document.documentElement;
  if (root.requestFullscreen) {
    try {
      await root.requestFullscreen();
      return "entered";
    } catch {
      // Fall through to the iOS / unsupported path.
    }
  }
  return isIos() ? "ios-install" : "unsupported";
}
