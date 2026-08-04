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
    ["1 200", 1200], // 空白は桁区切りと同じ扱いで落とす
    ["100+200*3", 700], // 乗除が先
    ["(100+200)*3", 900],
    ["-500+800", 300],
    ["1200.5+0.5", 1201],
    ["((1+2))*3", 9],
  ])("evaluateExpression(%s) = %d", (input, expected) => {
    expect(evaluateExpression(input)).toBe(expected)
  })

  it.each([
    ["１２００＋３４０", 1540], // 全角
    ["1200×3", 3600],
    ["1200÷4", 300],
    ["1200ー340", 860], // IME の長音記号を負号として扱う
    ["1200−340", 860], // U+2212
  ])("normalizes %s to %d", (input, expected) => {
    expect(evaluateExpression(input)).toBe(expected)
  })

  it.each([
    [""],
    ["   "],
    ["1200+"], // 式の途中
    ["+"],
    ["*300"],
    ["1200/0"], // 0 除算
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
  it("四捨五入して整数にする", () => {
    expect(evaluateAmount("1000/3")).toBe(333)
    expect(evaluateAmount("2000/3")).toBe(667)
    expect(evaluateAmount("1200.4")).toBe(1200)
    expect(evaluateAmount("1200.5")).toBe(1201)
  })

  it("評価できない入力は null", () => {
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
