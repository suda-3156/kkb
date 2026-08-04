import { describe, expect, it } from "vitest"
import { deleteBefore, insertAt } from "@/lib/textedit"

describe("insertAt", () => {
  it("キャレット位置に差し込む", () => {
    expect(insertAt("1200", 4, 4, "+")).toEqual({ value: "1200+", caret: 5 })
    expect(insertAt("1200", 2, 2, "9")).toEqual({ value: "12900", caret: 3 })
    expect(insertAt("", 0, 0, "7")).toEqual({ value: "7", caret: 1 })
  })

  it("選択範囲があれば置き換える", () => {
    expect(insertAt("1200+340", 0, 4, "500")).toEqual({ value: "500+340", caret: 3 })
  })

  it("複数文字も差し込める", () => {
    expect(insertAt("1", 1, 1, "00")).toEqual({ value: "100", caret: 3 })
  })
})

describe("deleteBefore", () => {
  it("キャレット手前の 1 文字を消す", () => {
    expect(deleteBefore("1200", 4, 4)).toEqual({ value: "120", caret: 3 })
    expect(deleteBefore("1200", 2, 2)).toEqual({ value: "100", caret: 1 })
  })

  it("選択範囲があればそれを消す", () => {
    expect(deleteBefore("1200+340", 4, 8)).toEqual({ value: "1200", caret: 4 })
  })

  it("先頭では何もしない", () => {
    expect(deleteBefore("1200", 0, 0)).toEqual({ value: "1200", caret: 0 })
    expect(deleteBefore("", 0, 0)).toEqual({ value: "", caret: 0 })
  })
})
