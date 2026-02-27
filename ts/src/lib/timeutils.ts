export const getWeek = (date: Date) => {
  const dayOfWeek = date.getDay()
  const start = new Date(date)
  start.setDate(date.getDate() - dayOfWeek)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export const getWeekStr = (date: Date) => {
  const { start, end } = getWeek(date)
  const startStr = `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, "0")}-${start.getDate().toString().padStart(2, "0")}`
  const endStr = `${end.getFullYear()}-${(end.getMonth() + 1).toString().padStart(2, "0")}-${end.getDate().toString().padStart(2, "0")}`

  return { start: startStr, end: endStr }
}

export const getMonth = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export const getMonthStr = (date: Date) => {
  const startStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-01`
  const endStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate().toString().padStart(2, "0")}`

  return { start: startStr, end: endStr }
}

export const getYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date.getFullYear(), 11, 31)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export const getYearStr = (date: Date) => {
  const startStr = `${date.getFullYear()}-01-01`
  const endStr = `${date.getFullYear()}-12-31`

  return { start: startStr, end: endStr }
}

export const dateStr = (date: Date) => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`
}
