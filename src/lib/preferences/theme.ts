const THEME_MODE_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
] as const;

export const THEME_MODE_VALUES = THEME_MODE_OPTIONS.map((o) => o.value);
export type ThemeMode = (typeof THEME_MODE_VALUES)[number];
export type ResolvedThemeMode = "light" | "dark";

// Lista mantida à mão: ao criar um arquivo em src/styles/presets/, acrescente o tema aqui.
// --- generated:themePresets:start ---

export const THEME_PRESET_OPTIONS = [
  {
    label: "Default",
    value: "default",
    primary: {
      light: "oklch(0.205 0 0)",
      dark: "oklch(0.922 0 0)",
    },
  },
  {
    label: "Brutalist",
    value: "brutalist",
    primary: {
      light: "oklch(0.6489 0.237 26.9728)",
      dark: "oklch(0.7044 0.1872 23.1858)",
    },
  },
  {
    label: "Soft Pop",
    value: "soft-pop",
    primary: {
      light: "oklch(0.5106 0.2301 276.9656)",
      dark: "oklch(0.6801 0.1583 276.9349)",
    },
  },
  {
    label: "Tangerine",
    value: "tangerine",
    primary: {
      light: "oklch(0.64 0.17 36.44)",
      dark: "oklch(0.64 0.17 36.44)",
    },
  },
  {
    label: "Zen",
    value: "zen",
    primary: {
      light: "oklch(0.3012 0 0)",
      dark: "oklch(0.852 0.0205 100.6306)",
    },
  },
  {
    label: "Claude",
    value: "claude",
    primary: {
      light: "oklch(0.6171 0.1375 39.0427)",
      dark: "oklch(0.6724 0.1308 38.7559)",
    },
  },
  {
    label: "YouTube",
    value: "youtube",
    primary: {
      light: "oklch(0.6280 0.2577 29.2339)",
      dark: "oklch(0.6280 0.2577 29.2339)",
    },
  },
  {
    label: "Serious Finance",
    value: "serious-finance",
    primary: {
      light: "oklch(0.5506 0.0816 207.1905)",
      dark: "oklch(0.8013 0.0644 202.2165)",
    },
  },
  {
    label: "Tokyo Night",
    value: "tokyo-night",
    primary: {
      light: "oklch(0.5102 0.1701 265.1204)",
      dark: "oklch(0.7257 0.1349 264.1586)",
    },
  },
] as const;

export const THEME_PRESET_VALUES = THEME_PRESET_OPTIONS.map((p) => p.value);

export type ThemePreset = (typeof THEME_PRESET_OPTIONS)[number]["value"];

// --- generated:themePresets:end ---
