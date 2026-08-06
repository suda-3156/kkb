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
 * 設定を atom で持つのは、SelectLedgerAccountField が仕訳行の数だけ並ぶため。
 * hook でインスタンスごとに state を持つと、設定変更が他の行に伝わらない。
 */

// createJSONStorage を使わず自前で組むのは、読み取りを必ず parseSettings に通すため。
// localStorage の値は壊れうるので、JSON.parse の結果をそのまま信じない。
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
  // 同一端末の別タブでも設定を揃える(端末ごとの設定なので、タブごとにずれる理由がない)
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
 * getOnInit は既定の false のまま。SSR とクライアントの初回描画がどちらも
 * DEFAULT_SETTINGS になるので hydration mismatch が起きない。
 * 代わりにマウント後に保存値へ切り替わるため、設定を画面に効かせる箇所では
 * 一瞬既定の表示になりうる。
 */
export const settingsAtom = atomWithStorage<Settings>(
  SETTINGS_STORAGE_KEY,
  DEFAULT_SETTINGS,
  settingsStorage,
)

/** 変更したい項目だけ渡して更新する。項目が増えても呼び出し側の形は変わらない。 */
export const updateSettingsAtom = atom(null, (get, set, patch: Partial<Settings>) => {
  set(settingsAtom, { ...get(settingsAtom), ...patch })
})

export const settingsOpenAtom = atom(false)
