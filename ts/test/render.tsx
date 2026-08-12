import { ApolloLink } from "@apollo/client"
import type { MockLink as MockLinkNamespace } from "@apollo/client/testing"
import { MockLink } from "@apollo/client/testing"
import { MockedProvider } from "@apollo/client/testing/react"
import { render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Provider } from "jotai"
import type { ReactElement } from "react"
import { GetLedgerAccountsForComboboxDoc } from "@/components/edit/fields/lac-select"
import type { LedgerAccountKind } from "@/graph/graphql"

/** Viewport widths either side of the 640px mobile breakpoint of useIsMobile. */
export const MOBILE_WIDTH = 375
export const DESKTOP_WIDTH = 1024

/**
 * Pick the viewport a test runs at. useIsMobile answers from window.innerWidth,
 * and the setup file's matchMedia stub follows it, so this decides whether the
 * amount keypad is rendered at all.
 */
export const setViewport = (width: number) => {
  window.innerWidth = width
}

export const account = (
  id: string,
  name: string,
  kind: LedgerAccountKind,
): Record<string, unknown> => ({
  __typename: "LedgerAccount",
  id,
  name,
  kind,
  isGroup: false,
  createdAt: "2026-01-01T00:00:00Z",
  lastUsedAt: null,
  lastRecordedAt: null,
})

/**
 * One page of accounts for a kind.
 *
 * hasNextPage has to stay false: SelectLedgerAccountField calls fetchMore while
 * it is true, and that follow-up request has no mock behind it.
 */
export const accountsMock = (
  kind: LedgerAccountKind,
  nodes: Record<string, unknown>[],
): MockLinkNamespace.MockedResponse => ({
  request: { query: GetLedgerAccountsForComboboxDoc, variables: { first: 100, kind } },
  result: {
    data: {
      ledgerAccounts: {
        __typename: "LedgerAccountConnection",
        nodes,
        pageInfo: { __typename: "PageInfo", hasNextPage: false, endCursor: null },
      },
    },
  },
})

export const EXPENSE_ACCOUNTS = [
  account("lac_expense_food", "食費", "EXPENSE"),
  account("lac_expense_rent", "家賃", "EXPENSE"),
]

export const ASSET_ACCOUNTS = [account("lac_asset_cash", "現金", "ASSET")]

export type RecordedOperation = {
  /** Empty for an anonymous operation; every document here is named. */
  name: string
  variables: Record<string, unknown>
}

/**
 * Render a form with the providers it reads from: Apollo for the account
 * queries and the mutations, and a fresh Jotai store so settings and modal
 * state do not leak between tests.
 *
 * Every operation is recorded before it reaches the mocks, so a test can assert
 * on the variables that were actually sent. Matching a mock is not enough on its
 * own: a mismatch only shows up as the error branch, which says nothing about
 * what differed.
 */
export const renderForm = (
  ui: ReactElement,
  {
    mocks = [],
    width = DESKTOP_WIDTH,
  }: { mocks?: MockLinkNamespace.MockedResponse[]; width?: number } = {},
) => {
  setViewport(width)

  const operations: RecordedOperation[] = []
  const recorder = new ApolloLink((operation, forward) => {
    operations.push({ name: operation.operationName ?? "", variables: operation.variables })
    return forward(operation)
  })

  const result = render(
    <MockedProvider link={ApolloLink.from([recorder, new MockLink(mocks)])}>
      <Provider>{ui}</Provider>
    </MockedProvider>,
  )

  return {
    ...result,
    user: userEvent.setup(),
    operations,
    /** The variables of the last call to `name`, or undefined if it never ran. */
    variablesOf: (name: string) =>
      operations.filter((operation) => operation.name === name).at(-1)?.variables,
    countOf: (name: string) => operations.filter((operation) => operation.name === name).length,
  }
}
