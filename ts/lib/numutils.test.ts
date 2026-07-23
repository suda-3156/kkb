import { describe, expect, it } from "vitest"
import { extractNumber, formatYen, insertCommas } from "@/lib/numutils"

describe("insertCommas", () => {
  it.each([
    [0, "0"],
    [100, "100"],
    [1000, "1,000"],
    [12345, "12,345"],
    [1234567, "1,234,567"],
    [999999999, "999,999,999"],
  ])("insertCommas(%i) = %s", (input, expected) => {
    expect(insertCommas(input)).toBe(expected)
  })

  it("handles negative numbers", () => {
    // The minus sign is not a digit boundary, so grouping applies to the digits.
    expect(insertCommas(-1234)).toBe("-1,234")
  })
})

describe("formatYen", () => {
  it("prefixes the yen sign and groups digits", () => {
    expect(formatYen(1234567)).toBe("¥1,234,567")
    expect(formatYen(0)).toBe("¥0")
  })
})

describe("extractNumber", () => {
  it.each([
    ["¥1,234", 1234],
    ["1,234,567", 1234567],
    ["¥1,234.5", 1234.5],
    ["-¥1,234", -1234],
    ["  500 円 ", 500],
  ])("extractNumber(%s) = %d", (input, expected) => {
    expect(extractNumber(input)).toBe(expected)
  })

  it("returns NaN when there is no number", () => {
    expect(extractNumber("abc")).toBeNaN()
    expect(extractNumber("")).toBeNaN()
  })
})
