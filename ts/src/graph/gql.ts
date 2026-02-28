/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query PeriodicExpenses(\n    $weekStart: Date!, $weekEnd: Date!\n    $monthStart: Date!, $monthEnd: Date!\n    $yearStart: Date!, $yearEnd: Date!\n  ) {\n    thisWeek:  periodAggregation(startDate: $weekStart,  endDate: $weekEnd)  { expenses { totalAmount } }\n    thisMonth: periodAggregation(startDate: $monthStart, endDate: $monthEnd) { expenses { totalAmount } }\n    thisYear:  periodAggregation(startDate: $yearStart,  endDate: $yearEnd)  { expenses { totalAmount } }\n  }\n": typeof types.PeriodicExpensesDocument,
    "\n  query ExpensesProportion($start: Date!, $end: Date!) {\n    periodAggregation(startDate: $start, endDate: $end) {\n        expenses {\n            totalAmount\n            byAccount {\n                totalAmount\n                ratio\n                ledgerAccount {\n                    name\n                    id\n                }\n            }\n        }\n    }\n  }\n": typeof types.ExpensesProportionDocument,
    "\n  query MonthlyExpensesSeries($start: Date!, $end: Date!) {\n    periodAggregationSeries(startDate: $start, endDate: $end, granularity: MONTHLY) {\n      dataPoints {\n        startDate\n        expenses {\n          totalAmount\n          byAccount {\n            totalAmount\n            ledgerAccount {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.MonthlyExpensesSeriesDocument,
    "\n  query RecentTransactions($today: Date!, $limit: Int!) {\n    transactions(last: $limit, endDate: $today) {\n      nodes {\n        id\n        date\n        description\n        entries {\n          amount\n          kind\n          ledgerAccount {\n            kind\n          }\n        }\n      }\n    }\n  }\n": typeof types.RecentTransactionsDocument,
    "\n  query LedgerAccountsForCommand {\n    ledgerAccounts(first: 100) {\n      nodes {\n        id\n        name\n        kind\n        isGroup\n      }\n    }\n  }\n": typeof types.LedgerAccountsForCommandDocument,
    "\n  mutation CreateTransactionFromModal($input: CreateTransactionInput!) {\n    createTransaction(input: $input) {\n      id\n      date\n      description\n      entries {\n        id\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n        }\n      }\n    }\n  }\n": typeof types.CreateTransactionFromModalDocument,
};
const documents: Documents = {
    "\n  query PeriodicExpenses(\n    $weekStart: Date!, $weekEnd: Date!\n    $monthStart: Date!, $monthEnd: Date!\n    $yearStart: Date!, $yearEnd: Date!\n  ) {\n    thisWeek:  periodAggregation(startDate: $weekStart,  endDate: $weekEnd)  { expenses { totalAmount } }\n    thisMonth: periodAggregation(startDate: $monthStart, endDate: $monthEnd) { expenses { totalAmount } }\n    thisYear:  periodAggregation(startDate: $yearStart,  endDate: $yearEnd)  { expenses { totalAmount } }\n  }\n": types.PeriodicExpensesDocument,
    "\n  query ExpensesProportion($start: Date!, $end: Date!) {\n    periodAggregation(startDate: $start, endDate: $end) {\n        expenses {\n            totalAmount\n            byAccount {\n                totalAmount\n                ratio\n                ledgerAccount {\n                    name\n                    id\n                }\n            }\n        }\n    }\n  }\n": types.ExpensesProportionDocument,
    "\n  query MonthlyExpensesSeries($start: Date!, $end: Date!) {\n    periodAggregationSeries(startDate: $start, endDate: $end, granularity: MONTHLY) {\n      dataPoints {\n        startDate\n        expenses {\n          totalAmount\n          byAccount {\n            totalAmount\n            ledgerAccount {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n": types.MonthlyExpensesSeriesDocument,
    "\n  query RecentTransactions($today: Date!, $limit: Int!) {\n    transactions(last: $limit, endDate: $today) {\n      nodes {\n        id\n        date\n        description\n        entries {\n          amount\n          kind\n          ledgerAccount {\n            kind\n          }\n        }\n      }\n    }\n  }\n": types.RecentTransactionsDocument,
    "\n  query LedgerAccountsForCommand {\n    ledgerAccounts(first: 100) {\n      nodes {\n        id\n        name\n        kind\n        isGroup\n      }\n    }\n  }\n": types.LedgerAccountsForCommandDocument,
    "\n  mutation CreateTransactionFromModal($input: CreateTransactionInput!) {\n    createTransaction(input: $input) {\n      id\n      date\n      description\n      entries {\n        id\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n        }\n      }\n    }\n  }\n": types.CreateTransactionFromModalDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PeriodicExpenses(\n    $weekStart: Date!, $weekEnd: Date!\n    $monthStart: Date!, $monthEnd: Date!\n    $yearStart: Date!, $yearEnd: Date!\n  ) {\n    thisWeek:  periodAggregation(startDate: $weekStart,  endDate: $weekEnd)  { expenses { totalAmount } }\n    thisMonth: periodAggregation(startDate: $monthStart, endDate: $monthEnd) { expenses { totalAmount } }\n    thisYear:  periodAggregation(startDate: $yearStart,  endDate: $yearEnd)  { expenses { totalAmount } }\n  }\n"): (typeof documents)["\n  query PeriodicExpenses(\n    $weekStart: Date!, $weekEnd: Date!\n    $monthStart: Date!, $monthEnd: Date!\n    $yearStart: Date!, $yearEnd: Date!\n  ) {\n    thisWeek:  periodAggregation(startDate: $weekStart,  endDate: $weekEnd)  { expenses { totalAmount } }\n    thisMonth: periodAggregation(startDate: $monthStart, endDate: $monthEnd) { expenses { totalAmount } }\n    thisYear:  periodAggregation(startDate: $yearStart,  endDate: $yearEnd)  { expenses { totalAmount } }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ExpensesProportion($start: Date!, $end: Date!) {\n    periodAggregation(startDate: $start, endDate: $end) {\n        expenses {\n            totalAmount\n            byAccount {\n                totalAmount\n                ratio\n                ledgerAccount {\n                    name\n                    id\n                }\n            }\n        }\n    }\n  }\n"): (typeof documents)["\n  query ExpensesProportion($start: Date!, $end: Date!) {\n    periodAggregation(startDate: $start, endDate: $end) {\n        expenses {\n            totalAmount\n            byAccount {\n                totalAmount\n                ratio\n                ledgerAccount {\n                    name\n                    id\n                }\n            }\n        }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MonthlyExpensesSeries($start: Date!, $end: Date!) {\n    periodAggregationSeries(startDate: $start, endDate: $end, granularity: MONTHLY) {\n      dataPoints {\n        startDate\n        expenses {\n          totalAmount\n          byAccount {\n            totalAmount\n            ledgerAccount {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query MonthlyExpensesSeries($start: Date!, $end: Date!) {\n    periodAggregationSeries(startDate: $start, endDate: $end, granularity: MONTHLY) {\n      dataPoints {\n        startDate\n        expenses {\n          totalAmount\n          byAccount {\n            totalAmount\n            ledgerAccount {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RecentTransactions($today: Date!, $limit: Int!) {\n    transactions(last: $limit, endDate: $today) {\n      nodes {\n        id\n        date\n        description\n        entries {\n          amount\n          kind\n          ledgerAccount {\n            kind\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query RecentTransactions($today: Date!, $limit: Int!) {\n    transactions(last: $limit, endDate: $today) {\n      nodes {\n        id\n        date\n        description\n        entries {\n          amount\n          kind\n          ledgerAccount {\n            kind\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query LedgerAccountsForCommand {\n    ledgerAccounts(first: 100) {\n      nodes {\n        id\n        name\n        kind\n        isGroup\n      }\n    }\n  }\n"): (typeof documents)["\n  query LedgerAccountsForCommand {\n    ledgerAccounts(first: 100) {\n      nodes {\n        id\n        name\n        kind\n        isGroup\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateTransactionFromModal($input: CreateTransactionInput!) {\n    createTransaction(input: $input) {\n      id\n      date\n      description\n      entries {\n        id\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateTransactionFromModal($input: CreateTransactionInput!) {\n    createTransaction(input: $input) {\n      id\n      date\n      description\n      entries {\n        id\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;