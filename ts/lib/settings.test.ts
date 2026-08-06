import { describe, expect, it } from "vitest"
import { DEFAULT_SETTINGS, parseSettings, type Settings, serializeSettings } from "@/lib/settings"

// localStorage には過去の版が書いた値が残り続けるため、
// 「どんな文字列を渡しても既定値に落ちて throw しない」ことがこの関数の仕様。

describe("parseSettings", () => {
  it("正しい JSON をそのまま読む", () => {
    expect(parseSettings('{"accountOrder":"lastUsed"}')).toEqual({ accountOrder: "lastUsed" })
  })

  it("値が無ければ既定値を返す", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings("")).toEqual(DEFAULT_SETTINGS)
  })

  it("壊れた JSON でも throw せず既定値を返す", () => {
    expect(parseSettings("{")).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings("not json")).toEqual(DEFAULT_SETTINGS)
  })

  it("JSON だがオブジェクトでない場合も既定値を返す", () => {
    expect(parseSettings("null")).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings("42")).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('"lastUsed"')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings("[]")).toEqual(DEFAULT_SETTINGS)
  })

  it("欠けたキーは既定値で埋める(設定項目を増やしてもマイグレーション不要)", () => {
    expect(parseSettings("{}")).toEqual(DEFAULT_SETTINGS)
  })

  it("未知のキーは捨てる(設定項目を減らしても壊れない)", () => {
    expect(parseSettings('{"accountOrder":"lastUsed","removedSetting":123}')).toEqual({
      accountOrder: "lastUsed",
    })
  })

  it("不正な値のキーだけ既定値に落とす", () => {
    expect(parseSettings('{"accountOrder":"unknown"}')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('{"accountOrder":42}')).toEqual(DEFAULT_SETTINGS)
  })
})

describe("serializeSettings", () => {
  it("parseSettings で往復できる", () => {
    const settings: Settings = { accountOrder: "lastUsed" }

    expect(parseSettings(serializeSettings(settings))).toEqual(settings)
  })
})
