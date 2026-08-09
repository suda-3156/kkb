import { describe, expect, it } from "vitest"
import { matchesQuery, normalize, toRomajiKey } from "@/lib/search"

// The point is to reduce "I typed it and it did not match", so the cases use
// strings a user would actually type.

describe("normalize", () => {
  it("folds katakana onto hiragana", () => {
    expect(normalize("クレジット")).toBe("くれじっと")
  })

  it("folds full-width latin and upper case", () => {
    expect(normalize("ＰａｙＰａｙ")).toBe("paypay")
  })

  it("folds half-width kana onto full-width hiragana", () => {
    expect(normalize("ｼｮｸﾋ")).toBe("しょくひ")
  })

  it("drops separators and whitespace", () => {
    expect(normalize("光熱 費・ガス")).toBe("光熱費がす")
  })
})

describe("toRomajiKey", () => {
  it("turns kana into romaji", () => {
    expect(toRomajiKey("しょくひ")).toBe("syokuhi")
  })

  it("collapses gemination and long vowels", () => {
    expect(toRomajiKey("クレジットカード")).toBe("kurezitokado")
  })

  it("folds alternative romaji spellings onto one form", () => {
    expect(toRomajiKey("shokuhi")).toBe(toRomajiKey("syokuhi"))
    expect(toRomajiKey("tsuka")).toBe(toRomajiKey("tuka"))
    expect(toRomajiKey("jitensha")).toBe(toRomajiKey("zitensya"))
  })

  // Without a reading there is nothing to project a kanji onto. That is the
  // normalized space's job.
  it("leaves kanji untouched", () => {
    expect(toRomajiKey("食費")).toBe("食費")
  })
})

describe("matchesQuery", () => {
  it("matches everything on an empty query", () => {
    expect(matchesQuery("食費", "")).toBe(true)
    expect(matchesQuery("食費", "   ")).toBe(true)
  })

  it("matches a substring", () => {
    expect(matchesQuery("水道光熱費", "光熱")).toBe(true)
  })

  it("matches skipped characters", () => {
    expect(matchesQuery("水道光熱費", "水熱")).toBe(true)
    expect(matchesQuery("クレジットカード払い", "くれ払")).toBe(true)
  })

  it("ignores kana script and character width", () => {
    expect(matchesQuery("クレジットカード", "くれじっと")).toBe(true)
    expect(matchesQuery("クレジットカード", "ｸﾚｼﾞｯﾄ")).toBe(true)
  })

  // Typing a latin account name with the IME still on: "pay" comes out as "ぱy".
  it("matches a latin account name typed in kana", () => {
    expect(matchesQuery("PayPay", "ぱy")).toBe(true)
    expect(matchesQuery("PayPay残高", "ぱy")).toBe(true)
  })

  it("matches a katakana account name typed in romaji", () => {
    expect(matchesQuery("クレジットカード", "kurejitto")).toBe(true)
    expect(matchesQuery("クレジットカード", "kurezitto")).toBe(true)
    expect(matchesQuery("プリペイドカード", "puripeido")).toBe(true)
  })

  it("rejects unrelated candidates", () => {
    expect(matchesQuery("食費", "交通")).toBe(false)
    expect(matchesQuery("PayPay", "すいどう")).toBe(false)
    expect(matchesQuery("クレジットカード", "genkin")).toBe(false)
  })

  // Kanji readings are out of scope. Making this pass needs somewhere to keep
  // the readings.
  it("KNOWN GAP: does not match a kanji by its reading", () => {
    expect(matchesQuery("食費", "しょくひ")).toBe(false)
    expect(matchesQuery("食費", "syokuhi")).toBe(false)
  })

  // Allowing skipped characters in romaji space would match nearly everything,
  // since one kana expands to two or three letters. Substrings only.
  // ("kurezitokado" contains k, z, k in order but never consecutively.)
  it("does not allow skipped characters in romaji space", () => {
    expect(matchesQuery("クレジットカード", "kzk")).toBe(false)
  })
})
