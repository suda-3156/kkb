import { screen, waitFor } from "@testing-library/react"
import { expect, test } from "vitest"
import { ExpenseForm } from "@/components/edit/view/expense"
import {
  ASSET_ACCOUNTS,
  accountsMock,
  EXPENSE_ACCOUNTS,
  MOBILE_WIDTH,
  renderForm,
} from "@/test/render"

// The keypad only exists below the 640px breakpoint: on a desktop viewport the
// OS keyboard is the input method and AmountKeypad is never rendered.
//
// NOT covered here, and not coverable: the reason `onDone` commits explicitly
// and the keypad listens on the document is that iOS does not reliably deliver
// blur when another field is activated. jsdom delivers it every time, so the
// input's own onBlur closes the keypad in each case below and the two guards
// are never what the assertions rest on. Removing either one leaves these tests
// green. They stay because the rules are worth pinning; they do not stand in
// for a device.
const mocks = [accountsMock("EXPENSE", EXPENSE_ACCOUNTS), accountsMock("ASSET", ASSET_ACCOUNTS)]

const setup = () => renderForm(<ExpenseForm />, { mocks, width: MOBILE_WIDTH })

const amountInput = () => screen.getByLabelText("金額")
const keypad = () => screen.queryByRole("group", { name: "電卓キーパッド" })

const expectClosed = () =>
  // AnimatePresence keeps the node mounted through the slide-out.
  waitFor(() => expect(keypad()).not.toBeInTheDocument())

test("focusing the amount opens the keypad and 完了 closes it", async () => {
  const { user } = setup()

  await user.click(amountInput())
  expect(keypad()).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "完了" }))

  await expectClosed()
})

test("a tap outside the input and the keypad closes it", async () => {
  const { user } = setup()

  await user.click(amountInput())
  expect(keypad()).toBeInTheDocument()

  await user.click(screen.getByLabelText("メモ"))

  await expectClosed()
})

test("the keypad is absent on a desktop viewport", async () => {
  const { user } = renderForm(<ExpenseForm />, { mocks })

  await user.click(amountInput())

  expect(keypad()).not.toBeInTheDocument()
})

// The keypad is the only way to enter an operator on mobile: the field sets
// inputMode="none" to keep the OS keyboard away.
test("keys reach the amount and 完了 commits the evaluated expression", async () => {
  const { user } = setup()

  await user.click(amountInput())
  for (const label of ["1", "2", "0", "0", "+", "3", "0", "0"]) {
    await user.click(screen.getByRole("button", { name: label }))
  }

  expect(amountInput()).toHaveValue("1200+300")

  await user.click(screen.getByRole("button", { name: "完了" }))

  await expectClosed()
  // Not editing any more, so the field shows the committed value with separators.
  expect(amountInput()).toHaveValue("1,500")
})
