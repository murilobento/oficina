import { getClientCookie } from "../cookie.client";
import { getLocalStorageValue } from "../local-storage.client";
import {
  getPreferencePersistence,
  PREFERENCE_DEFAULTS,
  PREFERENCE_KEYS,
  PREFERENCE_REGISTRY,
  type PreferenceKey,
  type PreferenceValueMap,
  parsePreference,
} from "./preferences-config";
import { applyThemeMode } from "./theme-utils";

function readStored(key: PreferenceKey): string | null | undefined {
  const mode = getPreferencePersistence(key);
  if (mode === "localStorage") return getLocalStorageValue(key);
  if (mode === "none") return null;
  return getClientCookie(key);
}

/**
 * Lê as preferências salvas e grava os atributos data-* no <html>.
 * Substitui o ThemeBootScript do template original (que rodava no servidor Next).
 */
export function bootPreferences(): PreferenceValueMap {
  const values = { ...PREFERENCE_DEFAULTS };
  const root = document.documentElement;

  function assign<K extends PreferenceKey>(key: K) {
    values[key] = parsePreference(key, readStored(key));
    root.setAttribute(PREFERENCE_REGISTRY[key].attribute, values[key]);
  }

  for (const key of PREFERENCE_KEYS) assign(key);
  applyThemeMode(values.theme_mode);
  return values;
}
