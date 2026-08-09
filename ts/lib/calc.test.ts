import { describe, expect, it } from "vitest"
import { containsOperator, evaluateAmount, evaluateExpression } from "@/lib/calc"

describe("evaluateExpression", () => {
  it.each([
    ["1200", 1200],
    ["1200+340", 1540],
    ["1200-340", 860],
    ["3*400", 1200],
    ["1200/4", 300],
    ["1,200+3,400", 4600],
    ["1200 + 340", 1540],
    ["1 200", 1200], // whitespace is dropped like a digit separator
    ["100+200*3", 700], // multiplication and division bind tighter
    ["(100+200)*3", 900],
    ["-500+800", 300],
    ["1200.5+0.5", 1201],
    ["((1+2))*3", 9],
  ])("evaluateExpression(%s) = %d", (input, expected) => {
    expect(evaluateExpression(input)).toBe(expected)
  })

  it.each([
    ["１２００＋３４０", 1540], // full-width
    ["1200×3", 3600],
    ["1200÷4", 300],
    ["1200ー340", 860], // the IME long-vowel mark counts as a minus sign
    ["1200−340", 860], // U+2212
  ])("normalizes %s to %d", (input, expected) => {
    expect(evaluateExpression(input)).toBe(expected)
  })

  it.each([
    [""],
    ["   "],
    ["1200+"], // incomplete expression
    ["+"],
    ["*300"],
    ["1200/0"], // division by zero
    ["(1200+300"],
    ["1200+300)"],
    ["1.2.3"],
    ["."],
    ["abc"],
    ["1200円"],
    ["1200%3"],
  ])("evaluateExpression(%s) = null", (input) => {
    expect(evaluateExpression(input)).toBeNull()
  })
})

describe("evaluateAmount", () => {
  it("rounds to an integer", () => {
    expect(evaluateAmount("1000/3")).toBe(333)
    expect(evaluateAmount("2000/3")).toBe(667)
    expect(evaluateAmount("1200.4")).toBe(1200)
    expect(evaluateAmount("1200.5")).toBe(1201)
  })

  it("returns null for input it cannot evaluate", () => {
    expect(evaluateAmount("1200+")).toBeNull()
    expect(evaluateAmount("")).toBeNull()
  })
})

describe("containsOperator", () => {
  it.each([
    ["1200", false],
    ["1,200", false],
    ["１２００", false],
    ["", false],
    ["1200+340", true],
    ["1200×3", true],
    ["1200ー340", true],
    ["(1200)", true],
  ])("containsOperator(%s) = %s", (input, expected) => {
    expect(containsOperator(input)).toBe(expected)
  })
})
