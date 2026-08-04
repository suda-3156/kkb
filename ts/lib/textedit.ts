// キーパッドから input のテキストを編集するための純粋関数。
// selectionStart / selectionEnd と現在値を渡すと、次の値とキャレット位置を返す。

export type TextEdit = { value: string; caret: number }

/** 選択範囲(なければキャレット位置)に text を差し込む。 */
export const insertAt = (value: string, start: number, end: number, text: string): TextEdit => ({
  value: value.slice(0, start) + text + value.slice(end),
  caret: start + text.length,
})

/** 選択範囲があればそれを、無ければキャレットの手前 1 文字を消す。 */
export const deleteBefore = (value: string, start: number, end: number): TextEdit => {
  if (start !== end) return { value: value.slice(0, start) + value.slice(end), caret: start }
  if (start === 0) return { value, caret: 0 }
  return { value: value.slice(0, start - 1) + value.slice(start), caret: start - 1 }
}
