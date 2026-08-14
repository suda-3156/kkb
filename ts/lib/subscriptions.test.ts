import { describe, expect, it } from "vitest"
import {
  autoColor,
  billingDay,
  debitTotal,
  groupByBillingDay,
  intervalLabel,
  monthDayLabel,
  occurrenceDisplay,
  resolveColor,
  SUBSCRIPTION_COLORS,
} from "./subscriptions"

describe("billingDay", () => {
  it("reads the day out of the anchor date", () => {
    expect(billingDay("2026-03-15")).toBe(15)
    expect(billingDay("2026-01-31")).toBe(31)
    expect(billingDay("2026-12-01")).toBe(1)
  })
})

describe("intervalLabel", () => {
  it("names the three shapes the form offers", () => {
    expect(intervalLabel(1)).toBe("毎月")
    expect(intervalLabel(12)).toBe("年払い")
    expect(intervalLabel(3)).toBe("3か月ごと")
  })
})

describe("debitTotal", () => {
  it("sums only the debit side", () => {
    expect(
      debitTotal([
        { amount: 1890, kind: "DEBIT" },
        { amount: 1890, kind: "CREDIT" },
      ]),
    ).toBe(1890)
  })

  it("is 0 for an empty template", () => {
    expect(debitTotal([])).toBe(0)
  })
})

describe("monthDayLabel", () => {
  it("drops zero padding", () => {
    expect(monthDayLabel("2026-08-05")).toBe("8/5")
    expect(monthDayLabel("2026-12-31")).toBe("12/31")
  })
})

describe("groupByBillingDay", () => {
  const sub = (anchorOn: string, status: "ACTIVE" | "PAUSED" | "CANCELED") => ({
    anchorOn,
    status,
  })

  it("places subscriptions on their anchor day", () => {
    const grouped = groupByBillingDay([
      sub("2026-03-15", "ACTIVE"),
      sub("2025-11-15", "PAUSED"),
      sub("2026-01-31", "ACTIVE"),
    ])

    expect(grouped.get(15)).toHaveLength(2)
    expect(grouped.get(31)).toHaveLength(1)
    expect(grouped.get(1)).toBeUndefined()
  })

  it("leaves canceled subscriptions off the calendar", () => {
    const grouped = groupByBillingDay([sub("2026-03-15", "CANCELED")])
    expect(grouped.size).toBe(0)
  })
})

describe("autoColor / resolveColor", () => {
  it("is deterministic for the same id", () => {
    expect(autoColor("sub_abcdefghijklmnop")).toBe(autoColor("sub_abcdefghijklmnop"))
  })

  it("always lands in the palette", () => {
    for (const id of ["sub_a", "sub_b", "sub_c", "sub_1234567890abcdef"]) {
      expect(SUBSCRIPTION_COLORS).toContain(autoColor(id))
    }
  })

  it("prefers the chosen color and falls back to the derived one", () => {
    expect(resolveColor("TEAL", "sub_a")).toBe("TEAL")
    expect(resolveColor(null, "sub_a")).toBe(autoColor("sub_a"))
    expect(resolveColor(undefined, "sub_a")).toBe(autoColor("sub_a"))
  })
})

describe("occurrenceDisplay", () => {
  it("distinguishes a deleted materialization from a live one", () => {
    expect(occurrenceDisplay("MATERIALIZED", true)).toBe("materialized")
    expect(occurrenceDisplay("MATERIALIZED", false)).toBe("deleted")
    expect(occurrenceDisplay("SKIPPED", false)).toBe("skipped")
    // A skipped occurrence never has a transaction, but the display must not
    // depend on that being enforced elsewhere.
    expect(occurrenceDisplay("SKIPPED", true)).toBe("skipped")
  })
})
