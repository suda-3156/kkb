import { atom } from "jotai"

/** Day (1..31) selected on the ideal calendar; null shows the empty prompt. */
export const selectedDayAtom = atom<number | null>(null)

/** Subscription shown in the detail dialog; null keeps it closed. */
export const detailSubscriptionIdAtom = atom<string | null>(null)

export const createSubscriptionOpenAtom = atom(false)
