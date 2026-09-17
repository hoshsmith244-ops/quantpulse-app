/**
 * Appearance settings.
 *
 * Everything here is expressed as a `data-*` attribute on <html>, and every
 * option is a pure CSS custom-property override in globals.css. No component
 * reads these values, which is what keeps the feature small: adding a palette
 * is a few lines of CSS, not a pass over the UI.
 *
 * One of these is not decoration. The market palette decides whether "up" is
 * green, and roughly one man in twelve cannot reliably separate green from red
 * — on a page where that distinction IS the information. The inverted option
 * is not a novelty either: red means up across most of East Asia.
 *
 * Kept free of React and of localStorage so the same definitions can be used
 * by the hook, by the settings page, and later by whatever syncs them.
 */

export type AccentId = "amber" | "cyan" | "violet" | "lime" | "sky";
export type MarketId = "classic" | "colorblind" | "inverted";
export type SurfaceId = "midnight" | "ink" | "slate";
export type GridId = "sharp" | "subtle" | "bold";

export type Appearance = {
  accent: AccentId;
  market: MarketId;
  surface: SurfaceId;
  grid: GridId;
  /** Faint lattice behind the interface. */
  texture: boolean;
};

export const DEFAULT_APPEARANCE: Appearance = {
  accent: "amber",
  market: "classic",
  surface: "midnight",
  grid: "sharp",
  texture: false,
};

/** localStorage key. Mirrored in the no-flash script in layout.tsx. */
export const APPEARANCE_KEY = "qp:appearance";

type Option<T> = {
  id: T;
  name: string;
  hint: string;
  /** Swatch colours for the picker, most significant first. */
  swatch: string[];
};

export const ACCENTS: Option<AccentId>[] = [
  { id: "amber", name: "Amber", hint: "The default. Trading-floor phosphor.", swatch: ["#ffb020"] },
  { id: "cyan", name: "Cyan", hint: "Cooler, closer to a data terminal.", swatch: ["#22d3ee"] },
  { id: "violet", name: "Violet", hint: "Softer, less alarm-like.", swatch: ["#a78bfa"] },
  { id: "lime", name: "Lime", hint: "High contrast on near-black.", swatch: ["#a3e635"] },
  { id: "sky", name: "Sky", hint: "Quietest of the five.", swatch: ["#60a5fa"] },
];

export const MARKETS: Option<MarketId>[] = [
  {
    id: "classic",
    name: "Green up",
    hint: "Western convention: green rises, red falls.",
    swatch: ["#00d492", "#ff4d4d"],
  },
  {
    id: "colorblind",
    name: "Blue / orange",
    hint: "Readable with red-green colour blindness, which affects about 1 man in 12.",
    swatch: ["#38bdf8", "#fb923c"],
  },
  {
    id: "inverted",
    name: "Red up",
    hint: "East Asian convention: red rises, green falls.",
    swatch: ["#ff4d4d", "#00d492"],
  },
];

export const SURFACES: Option<SurfaceId>[] = [
  { id: "midnight", name: "Midnight", hint: "Near-black with a blue cast.", swatch: ["#07090d", "#11151e"] },
  { id: "ink", name: "Ink", hint: "True black. Deepest contrast.", swatch: ["#000000", "#121212"] },
  { id: "slate", name: "Slate", hint: "Lifted and cooler, easier for long sessions.", swatch: ["#0d1117", "#1a212e"] },
];

export const GRIDS: Option<GridId>[] = [
  { id: "sharp", name: "Sharp", hint: "Visible hairlines. The default.", swatch: ["#2a3446"] },
  { id: "subtle", name: "Subtle", hint: "Panels float; less structure.", swatch: ["#1e2634"] },
  { id: "bold", name: "Bold", hint: "Heavier rules, closer to a spreadsheet.", swatch: ["#3d4a60"] },
];

const ACCENT_IDS = new Set(ACCENTS.map((a) => a.id));
const MARKET_IDS = new Set(MARKETS.map((m) => m.id));
const SURFACE_IDS = new Set(SURFACES.map((s) => s.id));
const GRID_IDS = new Set(GRIDS.map((g) => g.id));

/** Anything unrecognised falls back rather than rendering an unstyled page. */
export function sanitiseAppearance(raw: unknown): Appearance {
  if (!raw || typeof raw !== "object") return DEFAULT_APPEARANCE;
  const v = raw as Partial<Appearance>;
  return {
    accent: ACCENT_IDS.has(v.accent as AccentId) ? (v.accent as AccentId) : DEFAULT_APPEARANCE.accent,
    market: MARKET_IDS.has(v.market as MarketId) ? (v.market as MarketId) : DEFAULT_APPEARANCE.market,
    surface: SURFACE_IDS.has(v.surface as SurfaceId) ? (v.surface as SurfaceId) : DEFAULT_APPEARANCE.surface,
    grid: GRID_IDS.has(v.grid as GridId) ? (v.grid as GridId) : DEFAULT_APPEARANCE.grid,
    texture: v.texture === true,
  };
}

/** Writes the settings to <html> as data attributes. CSS does the rest. */
export function applyAppearance(a: Appearance, root?: HTMLElement) {
  const el = root ?? document.documentElement;
  el.dataset.accent = a.accent;
  el.dataset.market = a.market;
  el.dataset.surface = a.surface;
  el.dataset.grid = a.grid;
  if (a.texture) el.dataset.texture = "on";
  else delete el.dataset.texture;
}

export function isDefaultAppearance(a: Appearance) {
  return (
    a.accent === DEFAULT_APPEARANCE.accent &&
    a.market === DEFAULT_APPEARANCE.market &&
    a.surface === DEFAULT_APPEARANCE.surface &&
    a.grid === DEFAULT_APPEARANCE.grid &&
    a.texture === DEFAULT_APPEARANCE.texture
  );
}
