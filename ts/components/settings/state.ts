import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { SyncStorage } from "jotai/vanilla/utils/atomWithStorage"
import {
  DEFAULT_SETTINGS,
  parseSettings,
  SETTINGS_STORAGE_KEY,
  type Settings,
  serializeSettings,
} from "@/lib/settings"

/**
 * The settings live in an atom because SelectLedgerAccountField is rendered once per
 * journal line. Holding state per instance in a hook would keep a change from
 * reaching the other lines.
 */

// Hand-rolled instead of createJSONStorage so every read goes through parseSettings.
// A localStorage value can be broken, so the result of JSON.parse is not trusted.
const settingsStorage: SyncStorage<Settings> = {
  getItem: (key, initialValue) => {
    if (typeof window === "undefined") return initialValue
    return parseSettings(window.localStorage.getItem(key))
  },
  setItem: (key, value) => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(key, serializeSettings(value))
  },
  removeItem: (key) => {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(key)
  },
  // Keep other tabs on the same device in step: the settings belong to the device,
  // so there is no reason for tabs to disagree
  subscribe: (key, callback, initialValue) => {
    if (typeof window === "undefined") return undefined

    const handler = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || event.key !== key) return
      callback(event.newValue === null ? initialValue : parseSettings(event.newValue))
    }

    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  },
}

/**
 * getOnInit stays at its default of false: SSR and the first client render both use
 * DEFAULT_SETTINGS, so there is no hydration mismatch. The cost is that the stored
 * value only arrives after mount, so anywhere a setting drives the display it may
 * show the default for an instant.
 */
export const settingsAtom = atomWithStorage<Settings>(
  SETTINGS_STORAGE_KEY,
  DEFAULT_SETTINGS,
  settingsStorage,
)

/** Update by passing only the fields that change; adding settings leaves callers alone. */
export const updateSettingsAtom = atom(null, (get, set, patch: Partial<Settings>) => {
  set(settingsAtom, { ...get(settingsAtom), ...patch })
})

export const settingsOpenAtom = atom(false)
