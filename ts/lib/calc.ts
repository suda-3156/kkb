// 金額入力欄の電卓機能。入力テキストを四則演算の式として評価する。
//
// 文法(再帰下降):
//   expr   := term (('+' | '-') term)*
//   term   := factor (('*' | '/') factor)*
//   factor := ('+' | '-')* primary
//   primary := number | '(' expr ')'
//
// eval や Function は使わない。金額欄はユーザー自身の入力しか通らないが、
// 式の受理範囲を文法で閉じておくほうが挙動を説明しやすい。

/**
 * 全角・記号のゆれを ASCII の演算子に寄せ、桁区切りと空白を落とす。
 * NFKC が全角英数字と ＋－＊／（）を変換し、残る ×÷−ー を個別に潰す。
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
      // "1.2.3" や "." は Number が NaN にするので、ここで弾かれる
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

/** 数式として評価する。式が未完成・不正なら null(例外は投げない)。 */
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
        // 0 除算は Infinity になるので式ごと不正扱いにする
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
  // 余りトークン(例 "1 2" や "(1+2))")は不正
  if (value === null || pos !== tokens.length || !Number.isFinite(value)) return null
  return value
}

/** 式を評価する。数字だけの入力もそのまま通る。評価できなければ null。 */
export const evaluateExpression = (input: string): number | null => {
  const src = normalize(input)
  if (src === "") return null
  const tokens = tokenize(src)
  if (tokens === null) return null
  return parse(tokens)
}

/**
 * 金額欄向けの評価。金額は整数なので、割り算などで生じた端数は四捨五入する
 * (例 "1000/3" → 333)。丸め位置を 1 箇所に閉じ込めるため、UI 側では丸めない。
 */
export const evaluateAmount = (input: string): number | null => {
  const value = evaluateExpression(input)
  return value === null ? null : Math.round(value)
}

/** 演算子・括弧を含むか。式として確定操作が要るかの判定に使う。 */
export const containsOperator = (input: string): boolean => /[+\-*/()]/.test(normalize(input))
