import { describe, expect, it } from "vitest"
import { deleteBefore, insertAt } from "@/lib/textedit"

describe("insertAt", () => {
  it("inserts at the caret", () => {
    expect(insertAt("1200", 4, 4, "+")).toEqual({ value: "1200+", caret: 5 })
    expect(insertAt("1200", 2, 2, "9")).toEqual({ value: "12900", caret: 3 })
    expect(insertAt("", 0, 0, "7")).toEqual({ value: "7", caret: 1 })
  })

  it("replaces the selection when there is one", () => {
    expect(insertAt("1200+340", 0, 4, "500")).toEqual({ value: "500+340", caret: 3 })
  })

  it("inserts more than one character", () => {
    expect(insertAt("1", 1, 1, "00")).toEqual({ value: "100", caret: 3 })
  })
})

describe("deleteBefore", () => {
  it("deletes the character before the caret", () => {
    expect(deleteBefore("1200", 4, 4)).toEqual({ value: "120", caret: 3 })
    expect(deleteBefore("1200", 2, 2)).toEqual({ value: "100", caret: 1 })
  })

  it("deletes the selection when there is one", () => {
    expect(deleteBefore("1200+340", 4, 8)).toEqual({ value: "1200", caret: 4 })
  })

  it("does nothing at the start of the text", () => {
    expect(deleteBefore("1200", 0, 0)).toEqual({ value: "1200", caret: 0 })
    expect(deleteBefore("", 0, 0)).toEqual({ value: "", caret: 0 })
  })
})
