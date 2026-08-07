// Pure functions for editing an input's text from the keypad.
// Given selectionStart, selectionEnd and the current value, they return the next
// value and where the caret should land.

export type TextEdit = { value: string; caret: number }

/** Insert text over the selection, or at the caret when nothing is selected. */
export const insertAt = (value: string, start: number, end: number, text: string): TextEdit => ({
  value: value.slice(0, start) + text + value.slice(end),
  caret: start + text.length,
})

/** Delete the selection, or the single character before the caret. */
export const deleteBefore = (value: string, start: number, end: number): TextEdit => {
  if (start !== end) return { value: value.slice(0, start) + value.slice(end), caret: start }
  if (start === 0) return { value, caret: 0 }
  return { value: value.slice(0, start - 1) + value.slice(start), caret: start - 1 }
}
