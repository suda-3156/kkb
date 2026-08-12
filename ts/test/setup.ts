import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

// The suite does not use vitest globals, so RTL's automatic cleanup never
// registers itself.
afterEach(cleanup)

// jsdom has no matchMedia, and useIsMobile calls it during its first effect, so
// every component under test would throw before rendering. Answering from
// window.innerWidth means a test can pick the viewport by setting that alone.
//
// Base UI reads matchMedia too, for pointer and reduced-motion queries. Those
// are not max-width queries and correctly come back false.
window.matchMedia = (query: string): MediaQueryList => {
  const maxWidth = /\(max-width:\s*(\d+)px\)/.exec(query)

  return {
    matches: maxWidth ? window.innerWidth <= Number(maxWidth[1]) : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList
}

// jsdom does not lay anything out, so it implements no scrolling. The amount
// field scrolls itself into view when it takes focus on mobile, from inside a
// rAF callback where a throw becomes an unhandled error rather than a failure.
Element.prototype.scrollIntoView = () => {}

// useTransaction refreshes the route after a successful mutation. There is no
// App Router around a rendered component, so the real hook throws.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Asserting on a toast is how a test sees which branch a submit took.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))
