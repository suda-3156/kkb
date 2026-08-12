import { screen, waitFor } from "@testing-library/react"
import { expect, test } from "vitest"
import { CreateTransactionDoc } from "@/components/edit/queries"
import { todayString } from "@/lib/timeutils"
import { ASSET_ACCOUNTS, accountsMock, EXPENSE_ACCOUNTS, renderForm } from "@/test/render"
import { ExpenseForm } from "./expense"

const mocks = [accountsMock("EXPENSE", EXPENSE_ACCOUNTS), accountsMock("ASSET", ASSET_ACCOUNTS)]

const setup = () => renderForm(<ExpenseForm />, { mocks })

const categoryInput = () => screen.getByLabelText("費用科目")
const paymentInput = () => screen.getByLabelText("支払い方法")

/**
 * Open a combobox and wait for its accounts to arrive.
 *
 * The popup shows a spinner until the query resolves. Typing before then filters
 * an empty list, and the options that arrive afterwards land without a highlight.
 */
const open = async (
  user: ReturnType<typeof renderForm>["user"],
  input: HTMLElement,
  anyOption: string,
) => {
  await user.click(input)
  await screen.findByRole("option", { name: anyOption })
}

/**
 * Wait until `name` is the highlighted option.
 *
 * autoHighlight moves the highlight in an effect that runs after the filtered
 * list renders, so an option being on screen does not yet mean it is the
 * candidate Tab would commit.
 *
 * The element is re-queried on every poll on purpose: Base UI replaces the
 * option nodes as the list re-renders, and a reference taken beforehand is
 * detached by the time the highlight lands.
 */
const highlighted = (name: string) =>
  waitFor(() => expect(screen.getByRole("option", { name })).toHaveAttribute("data-highlighted"))

test("typing narrows the candidates to the matching account", async () => {
  const { user } = setup()
  const category = categoryInput()

  await open(user, category, "食費")
  await user.type(category, "食")

  expect(await screen.findByText("食費")).toBeInTheDocument()
  expect(screen.queryByText("家賃")).not.toBeInTheDocument()
})

// Base UI does not handle Tab: it lets the browser move focus, and closing the
// list then restores the input to the *selected* label, which is empty while
// only a highlight exists. The field adds a Tab handler that commits the
// highlight, the way Enter already does.
test("Tab commits the highlighted candidate and lands on the next field", async () => {
  const { user } = setup()
  const category = categoryInput()
  const payment = paymentInput()

  await open(user, category, "食費")
  await user.type(category, "食")
  await highlighted("食費")

  await user.tab()

  expect(category).toHaveValue("食費")
  // The `>` trigger carries tabIndex -1, so one Tab is enough to leave the
  // field. Without it every combobox costs an extra press.
  expect(payment).toHaveFocus()
})

// Either direction means the user is done with the field.
test("Shift+Tab commits the highlighted candidate too", async () => {
  const { user } = setup()
  const category = categoryInput()

  await open(user, category, "家賃")
  await user.type(category, "家")
  await highlighted("家賃")

  await user.tab({ shift: true })

  expect(category).toHaveValue("家賃")
})

// The form defaults the date field to today. Fake timers are not an option
// here: user-event drives its own clock and the form never settles under them.
const TODAY = todayString()

const createMock = {
  request: {
    query: CreateTransactionDoc,
    variables: {
      input: {
        date: TODAY,
        description: "ランチ",
        entries: [
          { ledgerAccountId: "lac_expense_food", amount: 1200, kind: "DEBIT" },
          { ledgerAccountId: "lac_asset_cash", amount: 1200, kind: "CREDIT" },
        ],
      },
    },
  },
  result: {
    data: {
      createTransaction: {
        __typename: "Transaction",
        id: "txn_created",
        date: TODAY,
        description: "ランチ",
        createdAt: `${TODAY}T09:00:00Z`,
        updatedAt: `${TODAY}T09:00:00Z`,
        entries: [
          {
            __typename: "JournalEntry",
            amount: 1200,
            kind: "DEBIT",
            ledgerAccount: { __typename: "LedgerAccount", id: "lac_expense_food", name: "食費" },
          },
          {
            __typename: "JournalEntry",
            amount: 1200,
            kind: "CREDIT",
            ledgerAccount: { __typename: "LedgerAccount", id: "lac_asset_cash", name: "現金" },
          },
        ],
      },
    },
  },
}

const pick = async (
  user: ReturnType<typeof renderForm>["user"],
  input: HTMLElement,
  query: string,
  name: string,
) => {
  await open(user, input, name)
  await user.type(input, query)
  await highlighted(name)
  await user.tab()
}

// Every message here comes from the zod schema. They are only reachable while
// no field carries the native `required` attribute: one of those makes the
// browser refuse the submit and show its own message instead, and the errors of
// the other fields never render at all.
test("an empty form reports every missing field and sends nothing", async () => {
  const { user, countOf } = setup()

  await user.click(screen.getByRole("button", { name: "確定" }))

  expect(await screen.findByText("説明は必須です")).toBeInTheDocument()
  expect(screen.getByText("費用科目を選択してください")).toBeInTheDocument()
  expect(screen.getByText("支払い方法を選択してください")).toBeInTheDocument()
  expect(countOf("CreateTransaction")).toBe(0)
})

test("a filled form sends one balanced transaction", async () => {
  const { user, variablesOf, countOf } = renderForm(<ExpenseForm />, {
    mocks: [...mocks, createMock],
  })

  await user.type(screen.getByLabelText("メモ"), "ランチ")
  await user.type(screen.getByLabelText("金額"), "1200")

  await pick(user, categoryInput(), "食", "食費")
  await pick(user, paymentInput(), "現", "現金")

  await user.click(screen.getByRole("button", { name: "確定" }))

  await waitFor(() => expect(countOf("CreateTransaction")).toBe(1))
  expect(variablesOf("CreateTransaction")).toEqual({
    input: {
      date: TODAY,
      description: "ランチ",
      // The expense account is debited, the asset paying for it credited.
      entries: [
        { ledgerAccountId: "lac_expense_food", amount: 1200, kind: "DEBIT" },
        { ledgerAccountId: "lac_asset_cash", amount: 1200, kind: "CREDIT" },
      ],
    },
  })
})
