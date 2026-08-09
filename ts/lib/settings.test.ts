import { describe, expect, it } from "vitest"
import { DEFAULT_SETTINGS, parseSettings, type Settings, serializeSettings } from "@/lib/settings"

// Values written by older versions live on in localStorage, so the specification
// of this function is: whatever string it is handed, fall back to the defaults and
// never throw.

describe("parseSettings", () => {
  it("reads valid JSON as-is", () => {
    expect(parseSettings('{"accountOrder":"lastUsed"}')).toEqual({ accountOrder: "lastUsed" })
  })

  it("returns the defaults when nothing is stored", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings("")).toEqual(DEFAULT_SETTINGS)
  })

  it("returns the defaults for broken JSON instead of throwing", () => {
    expect(parseSettings("{")).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings("not json")).toEqual(DEFAULT_SETTINGS)
  })

  it("returns the defaults for JSON that is not an object", () => {
    expect(parseSettings("null")).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings("42")).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('"lastUsed"')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings("[]")).toEqual(DEFAULT_SETTINGS)
  })

  it("fills a missing key with its default, so adding a setting needs no migration", () => {
    expect(parseSettings("{}")).toEqual(DEFAULT_SETTINGS)
  })

  it("drops an unknown key, so removing a setting breaks nothing", () => {
    expect(parseSettings('{"accountOrder":"lastUsed","removedSetting":123}')).toEqual({
      accountOrder: "lastUsed",
    })
  })

  it("falls back to the default only for the key whose value is invalid", () => {
    expect(parseSettings('{"accountOrder":"unknown"}')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('{"accountOrder":42}')).toEqual(DEFAULT_SETTINGS)
  })
})

describe("serializeSettings", () => {
  it("round-trips through parseSettings", () => {
    const settings: Settings = { accountOrder: "lastUsed" }

    expect(parseSettings(serializeSettings(settings))).toEqual(settings)
  })
})
