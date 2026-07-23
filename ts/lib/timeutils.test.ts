import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  dateToString,
  stringToDate,
  thisMonthString,
  thisWeekString,
  thisYearString,
  todayString,
} from "@/lib/timeutils"

// All tests run with TZ / NEXT_PUBLIC_TZ pinned to Asia/Tokyo (vitest.config.ts).
// Anchor fact: 2024-01-01 (JST) was a Monday.

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

const setNow = (isoWithOffset: string) => {
  vi.setSystemTime(new Date(isoWithOffset))
}

describe("todayString / dateToString / stringToDate", () => {
  it("todayString formats the current day as YYYY-MM-DD", () => {
    setNow("2024-01-03T12:00:00+09:00")
    expect(todayString()).toBe("2024-01-03")
  })

  it("dateToString ∘ stringToDate round-trips", () => {
    for (const s of ["2024-01-01", "2024-02-29", "2026-12-31"]) {
      expect(dateToString(stringToDate(s))).toBe(s)
    }
  })
})

describe("thisWeekString (Monday–Sunday)", () => {
  it.each([
    ["mid-week Wednesday", "2024-01-03T12:00:00+09:00"],
    ["Sunday belongs to the week starting the previous Monday", "2024-01-07T12:00:00+09:00"],
  ])("%s → 2024-01-01 .. 2024-01-07", (_name, now) => {
    setNow(now)
    expect(thisWeekString()).toEqual({ start: "2024-01-01", end: "2024-01-07" })
  })

  it("Monday starts a new week", () => {
    setNow("2024-01-08T12:00:00+09:00")
    expect(thisWeekString()).toEqual({ start: "2024-01-08", end: "2024-01-14" })
  })

  it("start is a Monday, end is a Sunday 6 days later, and today is within range", () => {
    setNow("2026-07-23T09:00:00+09:00")
    const { start, end } = thisWeekString()
    expect(stringToDate(start).getDay()).toBe(1) // Monday
    expect(stringToDate(end).getDay()).toBe(0) // Sunday
    const diffDays =
      (stringToDate(end).getTime() - stringToDate(start).getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBe(6)
    expect(start <= todayString() && todayString() <= end).toBe(true)
  })
})

describe("thisMonthString", () => {
  it("returns the first and last day of the month", () => {
    setNow("2024-01-15T12:00:00+09:00")
    expect(thisMonthString()).toEqual({ start: "2024-01-01", end: "2024-01-31" })
  })

  it("handles February in a leap year", () => {
    setNow("2024-02-10T12:00:00+09:00")
    expect(thisMonthString()).toEqual({ start: "2024-02-01", end: "2024-02-29" })
  })

  it("handles February in a non-leap year", () => {
    setNow("2026-02-10T12:00:00+09:00")
    expect(thisMonthString()).toEqual({ start: "2026-02-01", end: "2026-02-28" })
  })
})

describe("thisYearString", () => {
  it("returns Jan 1 to Dec 31 of the current year", () => {
    setNow("2026-07-23T12:00:00+09:00")
    expect(thisYearString()).toEqual({ start: "2026-01-01", end: "2026-12-31" })
  })
})
