// The start of the week is Monday, and the end of the week is Sunday.

const TZ = process.env.NEXT_PUBLIC_TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone

export function todayString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date())
}

export function dateToString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date)
}

export function stringToDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number)
  return new Date(y, m - 1, d)
}

type DateRange = {
  start: string
  end: string
}

export function thisWeekString(): DateRange {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 (Sun) - 6 (Sat)
  const diffToMonday = (dayOfWeek + 6) % 7
  const diffToSunday = (7 - dayOfWeek) % 7

  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - diffToMonday)

  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + diffToSunday)

  return {
    start: dateToString(startOfWeek),
    end: dateToString(endOfWeek),
  }
}

export function thisMonthString(): DateRange {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  return {
    start: dateToString(startOfMonth),
    end: dateToString(endOfMonth),
  }
}

export function thisYearString(): DateRange {
  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const endOfYear = new Date(today.getFullYear(), 11, 31)

  return {
    start: dateToString(startOfYear),
    end: dateToString(endOfYear),
  }
}
