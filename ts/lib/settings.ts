import { z } from "zod"

/**
 * 端末ごとのユーザー設定。
 *
 * localStorage に置く(スマホと PC で使い方が異なり、共有する必要がないため)。
 * 保存先が端末である以上、**過去の版が書いた値がそのまま残り続ける**。
 * 壊れた値で UI が壊れないよう、読むときは必ず parseSettings を通す。
 */

export const SETTINGS_STORAGE_KEY = "kkb.settings"

/** 勘定科目の候補の並び順。 */
export const accountOrderSchema = z
  .enum([
    /** 作成順(サーバの既定の並び) */
    "created",
    /** 直近に使った順 */
    "lastUsed",
  ])
  .default("created")
  .catch("created")

export const settingsSchema = z.object({
  accountOrder: accountOrderSchema,
})

export type Settings = z.infer<typeof settingsSchema>
export type AccountOrder = Settings["accountOrder"]

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({})

/**
 * localStorage の生文字列を Settings に変換する。**決して throw しない**。
 *
 * 各フィールドが default + catch を持つため、
 * - 欠けたキー → 既定値(設定項目を増やしてもマイグレーションが要らない)
 * - 未知のキー → Zod が捨てる(設定項目を減らしても壊れない)
 * - 不正な値   → 既定値
 * となる。この 3 つで足りている間はスキーマの version を持たない。
 * 必要になるのは「既存キーの意味が変わる」ときだけ。
 */
export const parseSettings = (raw: string | null | undefined): Settings => {
  if (!raw) return DEFAULT_SETTINGS

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return DEFAULT_SETTINGS
  }

  const parsed = settingsSchema.safeParse(json)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}

export const serializeSettings = (settings: Settings): string => JSON.stringify(settings)
