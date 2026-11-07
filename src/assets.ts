export interface AssetManifest {
  project: string;
  version: number;
  pathBase: string;
  images: {
    appIcon: {
      id: string;
      path: string;
      variants: Record<string, string>;
    };
    logo: {
      id: string;
      svg: string;
      dark: string;
      light: string;
    };
    backgrounds: {
      id: string;
      proMax: { path: string };
      pro: { path: string };
      desktop: { path: string };
    };
    covers: Record<
      string,
      {
        id: string;
        title: string;
        "512": string;
        "1024": string;
      }
    >;
  };
  audio: Record<
    string,
    {
      id: string;
      path: string;
      durationMs: number;
      loop: boolean;
    }
  >;
}

const COVER_KEYS: Record<string, string> = {
  twinkle: "twinkle",
  "two-tigers": "twoTigers",
  "ode-to-joy": "odeToJoy",
  birthday: "birthday",
  "jingle-bells": "jingleBells",
  "cde-etude": "cdeEtude",
  "hot-cross-buns": "hotCrossBuns",
  "mary-lamb": "maryLamb",
  "london-bridge": "londonBridge",
  "oh-susanna": "ohSusanna",
  "yankee-doodle": "yankeeDoodle",
  "old-macdonald": "oldMacdonald",
};

export async function loadManifest(): Promise<AssetManifest> {
  const response = await fetch("/manifest.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Manifest request failed: HTTP ${response.status}`);
  }
  return (await response.json()) as AssetManifest;
}

export function assetUrl(manifest: AssetManifest, path: string): string {
  if (path.startsWith("/")) {
    return path;
  }
  const base = manifest.pathBase === "/" ? "" : manifest.pathBase.replace(/\/$/, "");
  return `${base}/${path}`;
}

export function coverUrl(
  manifest: AssetManifest,
  songId: string,
  size: "512" | "1024" = "512",
): string {
  const key = COVER_KEYS[songId] ?? "twinkle";
  const cover = manifest.images.covers[key] ?? manifest.images.covers.twinkle;
  return assetUrl(manifest, cover[size]);
}

export function backgroundUrl(manifest: AssetManifest): string {
  return assetUrl(manifest, manifest.images.backgrounds.proMax.path);
}

export function logoUrl(manifest: AssetManifest): string {
  return assetUrl(manifest, manifest.images.logo.svg);
}

export function sfxUrl(manifest: AssetManifest, key: string): string | null {
  const item = manifest.audio[key];
  return item ? assetUrl(manifest, item.path) : null;
}
