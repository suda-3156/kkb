import { describe, expect, it } from "vitest"
import { matchesQuery, normalize, toRomajiKey } from "@/lib/search"

// 「打った通りに当たらない」を減らすのが目的なので、テストは実際に打ちそうな
// 文字列で書く。

describe("normalize", () => {
  it("カタカナをひらがなに揃える", () => {
    expect(normalize("クレジット")).toBe("くれじっと")
  })

  it("全角英数を半角に、大文字を小文字に揃える", () => {
    expect(normalize("ＰａｙＰａｙ")).toBe("paypay")
  })

  it("半角カナを全角のひらがなに揃える", () => {
    expect(normalize("ｼｮｸﾋ")).toBe("しょくひ")
  })

  it("区切り記号と空白を落とす", () => {
    expect(normalize("光熱 費・ガス")).toBe("光熱費がす")
  })
})

describe("toRomajiKey", () => {
  it("かなをローマ字にする", () => {
    expect(toRomajiKey("しょくひ")).toBe("syokuhi")
  })

  it("促音と長音は畳む", () => {
    expect(toRomajiKey("クレジットカード")).toBe("kurezitokado")
  })

  it("ローマ字入力のゆれを同じ形にする", () => {
    expect(toRomajiKey("shokuhi")).toBe(toRomajiKey("syokuhi"))
    expect(toRomajiKey("tsuka")).toBe(toRomajiKey("tuka"))
    expect(toRomajiKey("jitensha")).toBe(toRomajiKey("zitensya"))
  })

  // 読みが分からない以上、漢字はローマ字にできない。ここは正規化空間の担当。
  it("漢字はそのまま残す", () => {
    expect(toRomajiKey("食費")).toBe("食費")
  })
})

describe("matchesQuery", () => {
  it("空の入力はすべて通す", () => {
    expect(matchesQuery("食費", "")).toBe(true)
    expect(matchesQuery("食費", "   ")).toBe(true)
  })

  it("部分一致で当たる", () => {
    expect(matchesQuery("水道光熱費", "光熱")).toBe(true)
  })

  it("飛ばし読みで当たる", () => {
    expect(matchesQuery("水道光熱費", "水熱")).toBe(true)
    expect(matchesQuery("クレジットカード払い", "くれ払")).toBe(true)
  })

  it("かなカナ・全半角の違いを無視する", () => {
    expect(matchesQuery("クレジットカード", "くれじっと")).toBe(true)
    expect(matchesQuery("クレジットカード", "ｸﾚｼﾞｯﾄ")).toBe(true)
  })

  // IME を切り忘れて英字の科目名を打つ場合。「pay」が「ぱy」になって出てくる。
  it("かなで打った英字科目に当たる", () => {
    expect(matchesQuery("PayPay", "ぱy")).toBe(true)
    expect(matchesQuery("PayPay残高", "ぱy")).toBe(true)
  })

  it("ローマ字で打ったカナ科目に当たる", () => {
    expect(matchesQuery("クレジットカード", "kurejitto")).toBe(true)
    expect(matchesQuery("クレジットカード", "kurezitto")).toBe(true)
    expect(matchesQuery("プリペイドカード", "puripeido")).toBe(true)
  })

  it("関係ない候補は落とす", () => {
    expect(matchesQuery("食費", "交通")).toBe(false)
    expect(matchesQuery("PayPay", "すいどう")).toBe(false)
    expect(matchesQuery("クレジットカード", "genkin")).toBe(false)
  })

  // 漢字の読みは扱わない。ここが当たるようにするには読みを持つ仕組みが要る。
  it("KNOWN GAP: 漢字の読みでは当たらない", () => {
    expect(matchesQuery("食費", "しょくひ")).toBe(false)
    expect(matchesQuery("食費", "syokuhi")).toBe(false)
  })

  // ローマ字空間まで飛ばし読みを許すと、1 文字が 2〜3 字に膨らむせいで
  // ほとんどの候補が当たってしまう。substring だけに留める。
  // ("kurezitokado" に k→z→k は飛ばし読みなら当たるが、連続では現れない)
  it("ローマ字空間では飛ばし読みまでは許さない", () => {
    expect(matchesQuery("クレジットカード", "kzk")).toBe(false)
  })
})
