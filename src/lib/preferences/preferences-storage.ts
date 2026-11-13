import { setClientCookie } from "../cookie.client";
import { setLocalStorageValue } from "../local-storage.client";
import {
  getPreferencePersistence,
  type PreferenceKey,
  type PreferencePersistence,
  type PreferenceValueMap,
} from "./preferences-config";

function persistByMode(mode: PreferencePersistence, key: string, value: string): void {
  switch (mode) {
    case "none":
      return;

    // Nesta versão (SPA, sem servidor Next) os dois modos de cookie gravam no navegador.
    case "client-cookie":
    case "server-cookie":
      setClientCookie(key, value, 365);
      return;

    case "localStorage":
      setLocalStorageValue(key, value);
      return;
  }
}

export function persistPreference<K extends PreferenceKey>(key: K, value: PreferenceValueMap[K]): void {
  persistByMode(getPreferencePersistence(key), key, value);
}
