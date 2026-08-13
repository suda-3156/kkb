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
    "\n  query ExpenseCategoryBreakdown($start: Date!, $end: Date!) {\n    periodAggregation(startDate: $start, endDate: $end) {\n      expenses {\n        totalAmount\n        byAccount {\n          totalAmount\n          ratio\n          ledgerAccount {\n            id\n            name\n          }\n        }\n      }\n    }\n  }\n": typeof types.ExpenseCategoryBreakdownDocument,
    "\n  query ExpenseSummary (\n    $weekStart: Date!, $weekEnd: Date!\n    $monthStart: Date!, $monthEnd: Date!\n    $yearStart: Date!, $yearEnd: Date!\n  ) {\n    thisWeek:  periodAggregation(startDate: $weekStart,  endDate: $weekEnd)  { expenses { totalAmount } }\n    thisMonth: periodAggregation(startDate: $monthStart, endDate: $monthEnd) { expenses { totalAmount } }\n    thisYear:  periodAggregation(startDate: $yearStart,  endDate: $yearEnd)  { expenses { totalAmount } }\n  }\n": typeof types.ExpenseSummaryDocument,
    "\n  query MonthlyBalance($start: Date!, $end: Date!) {\n    periodAggregation(startDate: $start, endDate: $end) {\n      expenses { totalAmount }\n      revenue { totalAmount }\n      netAmount\n    }\n  }\n": typeof types.MonthlyBalanceDocument,
    "\n  query MonthlyExpenseTrend($start: Date!, $end: Date!) {\n    periodAggregationSeries(startDate: $start, endDate: $end, granularity: MONTHLY) {\n      dataPoints {\n        startDate\n        expenses {\n          byAccount {\n            totalAmount\n            ledgerAccount {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.MonthlyExpenseTrendDocument,
    "\n  query DashboardRecentTransactions($last: Int!) {\n    transactions(last: $last) {\n      nodes {\n        id\n        date\n        description\n        entries {\n          amount\n          kind\n          ledgerAccount {\n            kind\n            name\n          }\n        }\n      }\n    }\n  }\n": typeof types.DashboardRecentTransactionsDocument,
    "\n  query GetLedgerAccountsForCombobox($first: Int!, $after: ID, $kind: LedgerAccountKind) {\n    ledgerAccounts(first: $first, after: $after, kind: $kind) {\n      nodes {\n        id\n        name\n        kind\n        isGroup\n        createdAt\n        lastUsedAt\n        lastRecordedAt\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": typeof types.GetLedgerAccountsForComboboxDocument,
    "\n  query GetTransactionForModal($id: ID!) {\n    transaction(id: $id) {\n      id\n      date\n      description\n      updatedAt\n      entries {\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n        amount\n        kind\n      }\n    }\n  }\n": typeof types.GetTransactionForModalDocument,
    "\n  fragment LedgerAccountLastUsed on LedgerAccount {\n    id\n    lastUsedAt\n    lastRecordedAt\n  }\n": typeof types.LedgerAccountLastUsedFragmentDoc,
    "\n  mutation CreateTransaction($input: CreateTransactionInput!) {\n    createTransaction(input: $input) {\n      id\n      date\n      description\n      createdAt\n      updatedAt\n      entries {\n        ledgerAccount {\n          id\n          name\n        }\n        amount\n        kind\n      }\n    }\n  }\n": typeof types.CreateTransactionDocument,
    "\n  mutation DeleteTransaction($id: ID!) {\n    deleteTransaction(id: $id) {\n      success\n    }\n  }\n": typeof types.DeleteTransactionDocument,
    "\n  mutation UpdateTransaction($input: UpdateTransactionInput!) {\n    updateTransaction(input: $input) {\n      id\n      date\n      description\n      createdAt\n      updatedAt\n      entries {\n        ledgerAccount {\n          id\n          name\n        }\n        amount\n        kind\n      }\n    }\n  }\n": typeof types.UpdateTransactionDocument,
    "\n  query GetLedgerAccounts ($first: Int!, $after: ID) {\n    ledgerAccounts(first: $first, after: $after, includeArchived: true) {\n      nodes {\n        id\n        name\n        kind\n        isGroup\n        archivedAt\n        updatedAt\n        parent {\n          id\n        }\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n": typeof types.GetLedgerAccountsDocument,
    "\n  mutation ArchiveLedgerAccount($id: ID!) {\n    archiveLedgerAccount(id: $id) {\n      id\n      archivedAt\n    }\n  }\n": typeof types.ArchiveLedgerAccountDocument,
    "\n  mutation UnarchiveLedgerAccount($id: ID!) {\n    unarchiveLedgerAccount(id: $id) {\n      id\n      archivedAt\n    }\n  }\n": typeof types.UnarchiveLedgerAccountDocument,
    "\n  mutation UpdateLedgerAccount($input: UpdateLedgerAccountInput!) {\n    updateLedgerAccount(input: $input) {\n      id\n      name\n      parent {\n        id\n      }\n    }\n  }\n": typeof types.UpdateLedgerAccountDocument,
    "\n  mutation CreateLedgerAccount($input: CreateLedgerAccountInput!) {\n    createLedgerAccount(input: $input) {\n      id\n      name\n      kind\n      isGroup\n      updatedAt\n      parent {\n        id\n      }\n    }\n  }\n": typeof types.CreateLedgerAccountDocument,
    "\n  query Subscriptions($includeCanceled: Boolean) {\n    subscriptions(includeCanceled: $includeCanceled) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n    }\n  }\n": typeof types.SubscriptionsDocument,
    "\n  query SubscriptionDetail($id: ID!) {\n    subscription(id: $id) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n      occurrences {\n        occurrenceOn\n        outcome\n        createdAt\n        transaction {\n          id\n          date\n          description\n          entries {\n            amount\n            kind\n          }\n        }\n      }\n    }\n  }\n": typeof types.SubscriptionDetailDocument,
    "\n  mutation CreateSubscription($input: CreateSubscriptionInput!) {\n    createSubscription(input: $input) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n    }\n  }\n": typeof types.CreateSubscriptionDocument,
    "\n  mutation UpdateSubscription($input: UpdateSubscriptionInput!) {\n    updateSubscription(input: $input) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n    }\n  }\n": typeof types.UpdateSubscriptionDocument,
    "\n  mutation PauseSubscription($id: ID!) {\n    pauseSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n": typeof types.PauseSubscriptionDocument,
    "\n  mutation ResumeSubscription($id: ID!) {\n    resumeSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n": typeof types.ResumeSubscriptionDocument,
    "\n  mutation CancelSubscription($id: ID!) {\n    cancelSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n": typeof types.CancelSubscriptionDocument,
    "\n  mutation UncancelSubscription($id: ID!) {\n    uncancelSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n": typeof types.UncancelSubscriptionDocument,
};
const documents: Documents = {
    "\n  query ExpenseCategoryBreakdown($start: Date!, $end: Date!) {\n    periodAggregation(startDate: $start, endDate: $end) {\n      expenses {\n        totalAmount\n        byAccount {\n          totalAmount\n          ratio\n          ledgerAccount {\n            id\n            name\n          }\n        }\n      }\n    }\n  }\n": types.ExpenseCategoryBreakdownDocument,
    "\n  query ExpenseSummary (\n    $weekStart: Date!, $weekEnd: Date!\n    $monthStart: Date!, $monthEnd: Date!\n    $yearStart: Date!, $yearEnd: Date!\n  ) {\n    thisWeek:  periodAggregation(startDate: $weekStart,  endDate: $weekEnd)  { expenses { totalAmount } }\n    thisMonth: periodAggregation(startDate: $monthStart, endDate: $monthEnd) { expenses { totalAmount } }\n    thisYear:  periodAggregation(startDate: $yearStart,  endDate: $yearEnd)  { expenses { totalAmount } }\n  }\n": types.ExpenseSummaryDocument,
    "\n  query MonthlyBalance($start: Date!, $end: Date!) {\n    periodAggregation(startDate: $start, endDate: $end) {\n      expenses { totalAmount }\n      revenue { totalAmount }\n      netAmount\n    }\n  }\n": types.MonthlyBalanceDocument,
    "\n  query MonthlyExpenseTrend($start: Date!, $end: Date!) {\n    periodAggregationSeries(startDate: $start, endDate: $end, granularity: MONTHLY) {\n      dataPoints {\n        startDate\n        expenses {\n          byAccount {\n            totalAmount\n            ledgerAccount {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n": types.MonthlyExpenseTrendDocument,
    "\n  query DashboardRecentTransactions($last: Int!) {\n    transactions(last: $last) {\n      nodes {\n        id\n        date\n        description\n        entries {\n          amount\n          kind\n          ledgerAccount {\n            kind\n            name\n          }\n        }\n      }\n    }\n  }\n": types.DashboardRecentTransactionsDocument,
    "\n  query GetLedgerAccountsForCombobox($first: Int!, $after: ID, $kind: LedgerAccountKind) {\n    ledgerAccounts(first: $first, after: $after, kind: $kind) {\n      nodes {\n        id\n        name\n        kind\n        isGroup\n        createdAt\n        lastUsedAt\n        lastRecordedAt\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": types.GetLedgerAccountsForComboboxDocument,
    "\n  query GetTransactionForModal($id: ID!) {\n    transaction(id: $id) {\n      id\n      date\n      description\n      updatedAt\n      entries {\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n        amount\n        kind\n      }\n    }\n  }\n": types.GetTransactionForModalDocument,
    "\n  fragment LedgerAccountLastUsed on LedgerAccount {\n    id\n    lastUsedAt\n    lastRecordedAt\n  }\n": types.LedgerAccountLastUsedFragmentDoc,
    "\n  mutation CreateTransaction($input: CreateTransactionInput!) {\n    createTransaction(input: $input) {\n      id\n      date\n      description\n      createdAt\n      updatedAt\n      entries {\n        ledgerAccount {\n          id\n          name\n        }\n        amount\n        kind\n      }\n    }\n  }\n": types.CreateTransactionDocument,
    "\n  mutation DeleteTransaction($id: ID!) {\n    deleteTransaction(id: $id) {\n      success\n    }\n  }\n": types.DeleteTransactionDocument,
    "\n  mutation UpdateTransaction($input: UpdateTransactionInput!) {\n    updateTransaction(input: $input) {\n      id\n      date\n      description\n      createdAt\n      updatedAt\n      entries {\n        ledgerAccount {\n          id\n          name\n        }\n        amount\n        kind\n      }\n    }\n  }\n": types.UpdateTransactionDocument,
    "\n  query GetLedgerAccounts ($first: Int!, $after: ID) {\n    ledgerAccounts(first: $first, after: $after, includeArchived: true) {\n      nodes {\n        id\n        name\n        kind\n        isGroup\n        archivedAt\n        updatedAt\n        parent {\n          id\n        }\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n": types.GetLedgerAccountsDocument,
    "\n  mutation ArchiveLedgerAccount($id: ID!) {\n    archiveLedgerAccount(id: $id) {\n      id\n      archivedAt\n    }\n  }\n": types.ArchiveLedgerAccountDocument,
    "\n  mutation UnarchiveLedgerAccount($id: ID!) {\n    unarchiveLedgerAccount(id: $id) {\n      id\n      archivedAt\n    }\n  }\n": types.UnarchiveLedgerAccountDocument,
    "\n  mutation UpdateLedgerAccount($input: UpdateLedgerAccountInput!) {\n    updateLedgerAccount(input: $input) {\n      id\n      name\n      parent {\n        id\n      }\n    }\n  }\n": types.UpdateLedgerAccountDocument,
    "\n  mutation CreateLedgerAccount($input: CreateLedgerAccountInput!) {\n    createLedgerAccount(input: $input) {\n      id\n      name\n      kind\n      isGroup\n      updatedAt\n      parent {\n        id\n      }\n    }\n  }\n": types.CreateLedgerAccountDocument,
    "\n  query Subscriptions($includeCanceled: Boolean) {\n    subscriptions(includeCanceled: $includeCanceled) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n    }\n  }\n": types.SubscriptionsDocument,
    "\n  query SubscriptionDetail($id: ID!) {\n    subscription(id: $id) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n      occurrences {\n        occurrenceOn\n        outcome\n        createdAt\n        transaction {\n          id\n          date\n          description\n          entries {\n            amount\n            kind\n          }\n        }\n      }\n    }\n  }\n": types.SubscriptionDetailDocument,
    "\n  mutation CreateSubscription($input: CreateSubscriptionInput!) {\n    createSubscription(input: $input) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n    }\n  }\n": types.CreateSubscriptionDocument,
    "\n  mutation UpdateSubscription($input: UpdateSubscriptionInput!) {\n    updateSubscription(input: $input) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n    }\n  }\n": types.UpdateSubscriptionDocument,
    "\n  mutation PauseSubscription($id: ID!) {\n    pauseSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n": types.PauseSubscriptionDocument,
    "\n  mutation ResumeSubscription($id: ID!) {\n    resumeSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n": types.ResumeSubscriptionDocument,
    "\n  mutation CancelSubscription($id: ID!) {\n    cancelSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n": types.CancelSubscriptionDocument,
    "\n  mutation UncancelSubscription($id: ID!) {\n    uncancelSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n": types.UncancelSubscriptionDocument,
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
export function graphql(source: "\n  query ExpenseCategoryBreakdown($start: Date!, $end: Date!) {\n    periodAggregation(startDate: $start, endDate: $end) {\n      expenses {\n        totalAmount\n        byAccount {\n          totalAmount\n          ratio\n          ledgerAccount {\n            id\n            name\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ExpenseCategoryBreakdown($start: Date!, $end: Date!) {\n    periodAggregation(startDate: $start, endDate: $end) {\n      expenses {\n        totalAmount\n        byAccount {\n          totalAmount\n          ratio\n          ledgerAccount {\n            id\n            name\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ExpenseSummary (\n    $weekStart: Date!, $weekEnd: Date!\n    $monthStart: Date!, $monthEnd: Date!\n    $yearStart: Date!, $yearEnd: Date!\n  ) {\n    thisWeek:  periodAggregation(startDate: $weekStart,  endDate: $weekEnd)  { expenses { totalAmount } }\n    thisMonth: periodAggregation(startDate: $monthStart, endDate: $monthEnd) { expenses { totalAmount } }\n    thisYear:  periodAggregation(startDate: $yearStart,  endDate: $yearEnd)  { expenses { totalAmount } }\n  }\n"): (typeof documents)["\n  query ExpenseSummary (\n    $weekStart: Date!, $weekEnd: Date!\n    $monthStart: Date!, $monthEnd: Date!\n    $yearStart: Date!, $yearEnd: Date!\n  ) {\n    thisWeek:  periodAggregation(startDate: $weekStart,  endDate: $weekEnd)  { expenses { totalAmount } }\n    thisMonth: periodAggregation(startDate: $monthStart, endDate: $monthEnd) { expenses { totalAmount } }\n    thisYear:  periodAggregation(startDate: $yearStart,  endDate: $yearEnd)  { expenses { totalAmount } }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MonthlyBalance($start: Date!, $end: Date!) {\n    periodAggregation(startDate: $start, endDate: $end) {\n      expenses { totalAmount }\n      revenue { totalAmount }\n      netAmount\n    }\n  }\n"): (typeof documents)["\n  query MonthlyBalance($start: Date!, $end: Date!) {\n    periodAggregation(startDate: $start, endDate: $end) {\n      expenses { totalAmount }\n      revenue { totalAmount }\n      netAmount\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MonthlyExpenseTrend($start: Date!, $end: Date!) {\n    periodAggregationSeries(startDate: $start, endDate: $end, granularity: MONTHLY) {\n      dataPoints {\n        startDate\n        expenses {\n          byAccount {\n            totalAmount\n            ledgerAccount {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query MonthlyExpenseTrend($start: Date!, $end: Date!) {\n    periodAggregationSeries(startDate: $start, endDate: $end, granularity: MONTHLY) {\n      dataPoints {\n        startDate\n        expenses {\n          byAccount {\n            totalAmount\n            ledgerAccount {\n              id\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DashboardRecentTransactions($last: Int!) {\n    transactions(last: $last) {\n      nodes {\n        id\n        date\n        description\n        entries {\n          amount\n          kind\n          ledgerAccount {\n            kind\n            name\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query DashboardRecentTransactions($last: Int!) {\n    transactions(last: $last) {\n      nodes {\n        id\n        date\n        description\n        entries {\n          amount\n          kind\n          ledgerAccount {\n            kind\n            name\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetLedgerAccountsForCombobox($first: Int!, $after: ID, $kind: LedgerAccountKind) {\n    ledgerAccounts(first: $first, after: $after, kind: $kind) {\n      nodes {\n        id\n        name\n        kind\n        isGroup\n        createdAt\n        lastUsedAt\n        lastRecordedAt\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetLedgerAccountsForCombobox($first: Int!, $after: ID, $kind: LedgerAccountKind) {\n    ledgerAccounts(first: $first, after: $after, kind: $kind) {\n      nodes {\n        id\n        name\n        kind\n        isGroup\n        createdAt\n        lastUsedAt\n        lastRecordedAt\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetTransactionForModal($id: ID!) {\n    transaction(id: $id) {\n      id\n      date\n      description\n      updatedAt\n      entries {\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n        amount\n        kind\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetTransactionForModal($id: ID!) {\n    transaction(id: $id) {\n      id\n      date\n      description\n      updatedAt\n      entries {\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n        amount\n        kind\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment LedgerAccountLastUsed on LedgerAccount {\n    id\n    lastUsedAt\n    lastRecordedAt\n  }\n"): (typeof documents)["\n  fragment LedgerAccountLastUsed on LedgerAccount {\n    id\n    lastUsedAt\n    lastRecordedAt\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateTransaction($input: CreateTransactionInput!) {\n    createTransaction(input: $input) {\n      id\n      date\n      description\n      createdAt\n      updatedAt\n      entries {\n        ledgerAccount {\n          id\n          name\n        }\n        amount\n        kind\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateTransaction($input: CreateTransactionInput!) {\n    createTransaction(input: $input) {\n      id\n      date\n      description\n      createdAt\n      updatedAt\n      entries {\n        ledgerAccount {\n          id\n          name\n        }\n        amount\n        kind\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteTransaction($id: ID!) {\n    deleteTransaction(id: $id) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteTransaction($id: ID!) {\n    deleteTransaction(id: $id) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateTransaction($input: UpdateTransactionInput!) {\n    updateTransaction(input: $input) {\n      id\n      date\n      description\n      createdAt\n      updatedAt\n      entries {\n        ledgerAccount {\n          id\n          name\n        }\n        amount\n        kind\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateTransaction($input: UpdateTransactionInput!) {\n    updateTransaction(input: $input) {\n      id\n      date\n      description\n      createdAt\n      updatedAt\n      entries {\n        ledgerAccount {\n          id\n          name\n        }\n        amount\n        kind\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetLedgerAccounts ($first: Int!, $after: ID) {\n    ledgerAccounts(first: $first, after: $after, includeArchived: true) {\n      nodes {\n        id\n        name\n        kind\n        isGroup\n        archivedAt\n        updatedAt\n        parent {\n          id\n        }\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetLedgerAccounts ($first: Int!, $after: ID) {\n    ledgerAccounts(first: $first, after: $after, includeArchived: true) {\n      nodes {\n        id\n        name\n        kind\n        isGroup\n        archivedAt\n        updatedAt\n        parent {\n          id\n        }\n      }\n      pageInfo {\n        endCursor\n        hasNextPage\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ArchiveLedgerAccount($id: ID!) {\n    archiveLedgerAccount(id: $id) {\n      id\n      archivedAt\n    }\n  }\n"): (typeof documents)["\n  mutation ArchiveLedgerAccount($id: ID!) {\n    archiveLedgerAccount(id: $id) {\n      id\n      archivedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UnarchiveLedgerAccount($id: ID!) {\n    unarchiveLedgerAccount(id: $id) {\n      id\n      archivedAt\n    }\n  }\n"): (typeof documents)["\n  mutation UnarchiveLedgerAccount($id: ID!) {\n    unarchiveLedgerAccount(id: $id) {\n      id\n      archivedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateLedgerAccount($input: UpdateLedgerAccountInput!) {\n    updateLedgerAccount(input: $input) {\n      id\n      name\n      parent {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateLedgerAccount($input: UpdateLedgerAccountInput!) {\n    updateLedgerAccount(input: $input) {\n      id\n      name\n      parent {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateLedgerAccount($input: CreateLedgerAccountInput!) {\n    createLedgerAccount(input: $input) {\n      id\n      name\n      kind\n      isGroup\n      updatedAt\n      parent {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateLedgerAccount($input: CreateLedgerAccountInput!) {\n    createLedgerAccount(input: $input) {\n      id\n      name\n      kind\n      isGroup\n      updatedAt\n      parent {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Subscriptions($includeCanceled: Boolean) {\n    subscriptions(includeCanceled: $includeCanceled) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Subscriptions($includeCanceled: Boolean) {\n    subscriptions(includeCanceled: $includeCanceled) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SubscriptionDetail($id: ID!) {\n    subscription(id: $id) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n      occurrences {\n        occurrenceOn\n        outcome\n        createdAt\n        transaction {\n          id\n          date\n          description\n          entries {\n            amount\n            kind\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query SubscriptionDetail($id: ID!) {\n    subscription(id: $id) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n      occurrences {\n        occurrenceOn\n        outcome\n        createdAt\n        transaction {\n          id\n          date\n          description\n          entries {\n            amount\n            kind\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateSubscription($input: CreateSubscriptionInput!) {\n    createSubscription(input: $input) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateSubscription($input: CreateSubscriptionInput!) {\n    createSubscription(input: $input) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSubscription($input: UpdateSubscriptionInput!) {\n    updateSubscription(input: $input) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSubscription($input: UpdateSubscriptionInput!) {\n    updateSubscription(input: $input) {\n      id\n      name\n      registeredOn\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      intervalMonths\n      status\n      createdAt\n      updatedAt\n      templateEntries {\n        amount\n        kind\n        ledgerAccount {\n          id\n          name\n          kind\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PauseSubscription($id: ID!) {\n    pauseSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  mutation PauseSubscription($id: ID!) {\n    pauseSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResumeSubscription($id: ID!) {\n    resumeSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  mutation ResumeSubscription($id: ID!) {\n    resumeSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CancelSubscription($id: ID!) {\n    cancelSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  mutation CancelSubscription($id: ID!) {\n    cancelSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UncancelSubscription($id: ID!) {\n    uncancelSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  mutation UncancelSubscription($id: ID!) {\n    uncancelSubscription(id: $id) {\n      id\n      status\n      anchorOn\n      nextOccurrenceOn\n      coveredThroughOn\n      updatedAt\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;