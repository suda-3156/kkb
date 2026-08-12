import { render, screen } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { expect, test } from "vitest"
import { SettingsDialog } from "./dialog"
import { settingsOpenAtom } from "./state"

// The account order control is a button rather than an input, which is still a
// labelable element: `for` and `id` associate the two the same way.
test("the account order control is reachable by its label", () => {
  const store = createStore()
  store.set(settingsOpenAtom, true)

  render(
    <Provider store={store}>
      <SettingsDialog />
    </Provider>,
  )

  expect(screen.getByLabelText("勘定科目の並び順")).toBeInTheDocument()
})
