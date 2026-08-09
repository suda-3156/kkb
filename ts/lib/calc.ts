// Calculator behaviour for the amount field: evaluate the typed text as an
// arithmetic expression.
//
// Grammar (recursive descent):
//   expr   := term (('+' | '-') term)*
//   term   := factor (('*' | '/') factor)*
//   factor := ('+' | '-')* primary
//   primary := number | '(' expr ')'
//
// No eval, no Function. Only the user's own input ever reaches this field, but
// pinning what is accepted to a grammar makes the behaviour easier to explain.

/**
 * Fold full-width forms and symbol variants onto ASCII operators, and drop digit
 * separators and whitespace. NFKC handles full-width alphanumerics, the four
 * arithmetic signs and parentheses; the multiplication, division, minus and
 * long-vowel variants left over are folded one by one below.
 */
const normalize = (input: string): string =>
  input
    .normalize("NFKC")
    .replace(/[\s,_]/g, "")
    .replace(/[×✕]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—ー]/g, "-")

type Token = { type: "num"; value: number } | { type: "op"; value: string }

const tokenize = (src: string): Token[] | null => {
  const tokens: Token[] = []
  let i = 0

  while (i < src.length) {
    const ch = src[i]

    if (/[\d.]/.test(ch)) {
      let j = i
      while (j < src.length && /[\d.]/.test(src[j])) j++
      // Number() yields NaN for "1.2.3" or ".", so those are rejected here
      const value = Number(src.slice(i, j))
      if (!Number.isFinite(value)) return null
      tokens.push({ type: "num", value })
      i = j
      continue
    }

    if ("+-*/()".includes(ch)) {
      tokens.push({ type: "op", value: ch })
      i++
      continue
    }

    return null
  }

  return tokens
}

/** Evaluate as an expression. Returns null when incomplete or invalid; never throws. */
const parse = (tokens: Token[]): number | null => {
  let pos = 0

  const eat = (value: string): boolean => {
    const token = tokens[pos]
    if (token?.type === "op" && token.value === value) {
      pos++
      return true
    }
    return false
  }

  const expr = (): number | null => {
    let left = term()
    if (left === null) return null
    for (;;) {
      if (eat("+")) {
        const right = term()
        if (right === null) return null
        left += right
      } else if (eat("-")) {
        const right = term()
        if (right === null) return null
        left -= right
      } else {
        return left
      }
    }
  }

  const term = (): number | null => {
    let left = factor()
    if (left === null) return null
    for (;;) {
      if (eat("*")) {
        const right = factor()
        if (right === null) return null
        left *= right
      } else if (eat("/")) {
        const right = factor()
        // Division by zero yields Infinity, so reject the whole expression
        if (right === null || right === 0) return null
        left /= right
      } else {
        return left
      }
    }
  }

  const factor = (): number | null => {
    if (eat("-")) {
      const value = factor()
      return value === null ? null : -value
    }
    if (eat("+")) return factor()

    const token = tokens[pos]
    if (!token) return null
    if (token.type === "num") {
      pos++
      return token.value
    }
    if (token.value === "(") {
      pos++
      const value = expr()
      if (value === null || !eat(")")) return null
      return value
    }
    return null
  }

  const value = expr()
  // Leftover tokens ("1 2", "(1+2))") make the expression invalid
  if (value === null || pos !== tokens.length || !Number.isFinite(value)) return null
  return value
}

/** Evaluate an expression. A bare number passes through. Returns null if it cannot. */
export const evaluateExpression = (input: string): number | null => {
  const src = normalize(input)
  if (src === "") return null
  const tokens = tokenize(src)
  if (tokens === null) return null
  return parse(tokens)
}

/**
 * Evaluation for the amount field. Amounts are integers, so a fraction produced by
 * division is rounded here ("1000/3" -> 333). Rounding lives in this one place;
 * the UI never rounds.
 */
export const evaluateAmount = (input: string): number | null => {
  const value = evaluateExpression(input)
  return value === null ? null : Math.round(value)
}

/** Whether the text holds an operator or parenthesis, i.e. needs an explicit commit. */
export const containsOperator = (input: string): boolean => /[+\-*/()]/.test(normalize(input))
