/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: any; output: any; }
  DateTime: { input: any; output: any; }
};

export type AccountAmountSummary = {
  __typename?: 'AccountAmountSummary';
  ledgerAccount: LedgerAccount;
  ratio: Scalars['Float']['output'];
  totalAmount: Scalars['Int']['output'];
};

export type AccountBalance = {
  __typename?: 'AccountBalance';
  asOf: Scalars['Date']['output'];
  balance: Scalars['Int']['output'];
  ledgerAccount: LedgerAccount;
};

export type ChildAccountBreakdown = {
  __typename?: 'ChildAccountBreakdown';
  children: Array<AccountAmountSummary>;
  endDate: Scalars['Date']['output'];
  parent: LedgerAccount;
  startDate: Scalars['Date']['output'];
  totalAmount: Scalars['Int']['output'];
};

export type CreateLedgerAccountInput = {
  isGroup?: Scalars['Boolean']['input'];
  kind: LedgerAccountKind;
  name: Scalars['String']['input'];
  parentId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateTransactionInput = {
  date: Scalars['Date']['input'];
  description: Scalars['String']['input'];
  entries: Array<JournalEntryInput>;
};

export type DeleteTransactionPayload = {
  __typename?: 'DeleteTransactionPayload';
  success: Scalars['Boolean']['output'];
};

export type ExpenseSummary = {
  __typename?: 'ExpenseSummary';
  byAccount: Array<AccountAmountSummary>;
  totalAmount: Scalars['Int']['output'];
};

export enum Granularity {
  Daily = 'DAILY',
  Monthly = 'MONTHLY',
  Weekly = 'WEEKLY'
}

export type JournalEntry = Node & {
  __typename?: 'JournalEntry';
  amount: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  kind: JournalEntryKind;
  ledgerAccount: LedgerAccount;
  updatedAt: Scalars['DateTime']['output'];
};

export type JournalEntryInput = {
  amount: Scalars['Int']['input'];
  kind: JournalEntryKind;
  ledgerAccountId: Scalars['ID']['input'];
};

export enum JournalEntryKind {
  Credit = 'CREDIT',
  Debit = 'DEBIT'
}

export type LedgerAccount = Node & {
  __typename?: 'LedgerAccount';
  archivedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isGroup: Scalars['Boolean']['output'];
  kind: LedgerAccountKind;
  name: Scalars['String']['output'];
  parent?: Maybe<LedgerAccount>;
  updatedAt: Scalars['DateTime']['output'];
};

export type LedgerAccountConnection = {
  __typename?: 'LedgerAccountConnection';
  edges?: Maybe<Array<Maybe<LedgerAccountEdge>>>;
  nodes?: Maybe<Array<Maybe<LedgerAccount>>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type LedgerAccountEdge = {
  __typename?: 'LedgerAccountEdge';
  cursor: Scalars['ID']['output'];
  node: LedgerAccount;
};

export enum LedgerAccountKind {
  Asset = 'ASSET',
  Equity = 'EQUITY',
  Expense = 'EXPENSE',
  Liability = 'LIABILITY',
  Revenue = 'REVENUE'
}

export type Mutation = {
  __typename?: 'Mutation';
  archiveLedgerAccount: LedgerAccount;
  createLedgerAccount: LedgerAccount;
  createTransaction: Transaction;
  deleteTransaction: DeleteTransactionPayload;
  unarchiveLedgerAccount: LedgerAccount;
  updateLedgerAccount: LedgerAccount;
  updateTransaction: Transaction;
};


export type MutationArchiveLedgerAccountArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateLedgerAccountArgs = {
  input: CreateLedgerAccountInput;
};


export type MutationCreateTransactionArgs = {
  input: CreateTransactionInput;
};


export type MutationDeleteTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUnarchiveLedgerAccountArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateLedgerAccountArgs = {
  input: UpdateLedgerAccountInput;
};


export type MutationUpdateTransactionArgs = {
  input: UpdateTransactionInput;
};

export type Node = {
  id: Scalars['ID']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['ID']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['ID']['output']>;
};

export type PeriodAggregation = {
  __typename?: 'PeriodAggregation';
  endDate: Scalars['Date']['output'];
  expenses: ExpenseSummary;
  netAmount: Scalars['Int']['output'];
  revenue: RevenueSummary;
  startDate: Scalars['Date']['output'];
};

export type PeriodAggregationSeries = {
  __typename?: 'PeriodAggregationSeries';
  dataPoints: Array<PeriodAggregation>;
  granularity: Granularity;
};

export type Query = {
  __typename?: 'Query';
  childAccountBreakdown: ChildAccountBreakdown;
  healthCheck: Scalars['String']['output'];
  ledgerAccount?: Maybe<LedgerAccount>;
  ledgerAccounts: LedgerAccountConnection;
  node?: Maybe<Node>;
  periodAggregation: PeriodAggregation;
  periodAggregationSeries: PeriodAggregationSeries;
  transaction?: Maybe<Transaction>;
  transactions: TransactionConnection;
  trialBalance: TrialBalance;
};


export type QueryChildAccountBreakdownArgs = {
  endDate: Scalars['Date']['input'];
  parentId: Scalars['ID']['input'];
  startDate: Scalars['Date']['input'];
};


export type QueryLedgerAccountArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLedgerAccountsArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  before?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  includeArchived?: InputMaybe<Scalars['Boolean']['input']>;
  kind?: InputMaybe<LedgerAccountKind>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPeriodAggregationArgs = {
  endDate: Scalars['Date']['input'];
  startDate: Scalars['Date']['input'];
};


export type QueryPeriodAggregationSeriesArgs = {
  endDate: Scalars['Date']['input'];
  granularity: Granularity;
  startDate: Scalars['Date']['input'];
};


export type QueryTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTransactionsArgs = {
  after?: InputMaybe<Scalars['ID']['input']>;
  before?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['Date']['input']>;
};


export type QueryTrialBalanceArgs = {
  asOf: Scalars['Date']['input'];
};

export type RevenueSummary = {
  __typename?: 'RevenueSummary';
  byAccount: Array<AccountAmountSummary>;
  totalAmount: Scalars['Int']['output'];
};

export type Transaction = Node & {
  __typename?: 'Transaction';
  createdAt: Scalars['DateTime']['output'];
  date: Scalars['Date']['output'];
  description: Scalars['String']['output'];
  entries: Array<JournalEntry>;
  id: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type TransactionConnection = {
  __typename?: 'TransactionConnection';
  edges?: Maybe<Array<Maybe<TransactionEdge>>>;
  nodes?: Maybe<Array<Maybe<Transaction>>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type TransactionEdge = {
  __typename?: 'TransactionEdge';
  cursor: Scalars['ID']['output'];
  node: Transaction;
};

export type TrialBalance = {
  __typename?: 'TrialBalance';
  accounts: Array<AccountBalance>;
  asOf: Scalars['Date']['output'];
  netWorth: Scalars['Int']['output'];
};

export type UpdateLedgerAccountInput = {
  id: Scalars['ID']['input'];
  isGroup?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  parentId?: InputMaybe<Scalars['ID']['input']>;
  unsetParent?: Scalars['Boolean']['input'];
  updatedAt: Scalars['DateTime']['input'];
};

export type UpdateTransactionInput = {
  date?: InputMaybe<Scalars['Date']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  entries?: InputMaybe<Array<JournalEntryInput>>;
  id: Scalars['ID']['input'];
  updatedAt: Scalars['DateTime']['input'];
};

export type PeriodicExpensesQueryVariables = Exact<{
  weekStart: Scalars['Date']['input'];
  weekEnd: Scalars['Date']['input'];
  monthStart: Scalars['Date']['input'];
  monthEnd: Scalars['Date']['input'];
  yearStart: Scalars['Date']['input'];
  yearEnd: Scalars['Date']['input'];
}>;


export type PeriodicExpensesQuery = { __typename?: 'Query', thisWeek: { __typename?: 'PeriodAggregation', expenses: { __typename?: 'ExpenseSummary', totalAmount: number } }, thisMonth: { __typename?: 'PeriodAggregation', expenses: { __typename?: 'ExpenseSummary', totalAmount: number } }, thisYear: { __typename?: 'PeriodAggregation', expenses: { __typename?: 'ExpenseSummary', totalAmount: number } } };

export type ExpensesProportionQueryVariables = Exact<{
  start: Scalars['Date']['input'];
  end: Scalars['Date']['input'];
}>;


export type ExpensesProportionQuery = { __typename?: 'Query', periodAggregation: { __typename?: 'PeriodAggregation', expenses: { __typename?: 'ExpenseSummary', totalAmount: number, byAccount: Array<{ __typename?: 'AccountAmountSummary', totalAmount: number, ratio: number, ledgerAccount: { __typename?: 'LedgerAccount', name: string, id: string } }> } } };

export type MonthlyExpensesSeriesQueryVariables = Exact<{
  start: Scalars['Date']['input'];
  end: Scalars['Date']['input'];
}>;


export type MonthlyExpensesSeriesQuery = { __typename?: 'Query', periodAggregationSeries: { __typename?: 'PeriodAggregationSeries', dataPoints: Array<{ __typename?: 'PeriodAggregation', startDate: any, expenses: { __typename?: 'ExpenseSummary', totalAmount: number, byAccount: Array<{ __typename?: 'AccountAmountSummary', totalAmount: number, ledgerAccount: { __typename?: 'LedgerAccount', id: string, name: string } }> } }> } };

export type RecentTransactionsQueryVariables = Exact<{
  last: Scalars['Int']['input'];
}>;


export type RecentTransactionsQuery = { __typename?: 'Query', transactions: { __typename?: 'TransactionConnection', nodes?: Array<{ __typename?: 'Transaction', id: string, date: any, description: string, updatedAt: any, entries: Array<{ __typename?: 'JournalEntry', amount: number, kind: JournalEntryKind, ledgerAccount: { __typename?: 'LedgerAccount', kind: LedgerAccountKind } }> } | null> | null } };

export type GetLedgerAccountsForCmdQueryVariables = Exact<{
  first: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['ID']['input']>;
}>;


export type GetLedgerAccountsForCmdQuery = { __typename?: 'Query', ledgerAccounts: { __typename?: 'LedgerAccountConnection', nodes?: Array<{ __typename?: 'LedgerAccount', id: string, name: string, kind: LedgerAccountKind, isGroup: boolean } | null> | null, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } };

export type GetLedgerAccountsForComboboxQueryVariables = Exact<{
  first: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['ID']['input']>;
  kind?: InputMaybe<LedgerAccountKind>;
}>;


export type GetLedgerAccountsForComboboxQuery = { __typename?: 'Query', ledgerAccounts: { __typename?: 'LedgerAccountConnection', nodes?: Array<{ __typename?: 'LedgerAccount', id: string, name: string, kind: LedgerAccountKind, isGroup: boolean } | null> | null, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } };

export type GetTransactionForModalQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTransactionForModalQuery = { __typename?: 'Query', transaction?: { __typename?: 'Transaction', id: string, date: any, description: string, updatedAt: any, entries: Array<{ __typename?: 'JournalEntry', id: string, amount: number, kind: JournalEntryKind, ledgerAccount: { __typename?: 'LedgerAccount', id: string, name: string, kind: LedgerAccountKind } }> } | null };

export type CreateTransactionMutationVariables = Exact<{
  input: CreateTransactionInput;
}>;


export type CreateTransactionMutation = { __typename?: 'Mutation', createTransaction: { __typename?: 'Transaction', id: string, date: any, description: string, createdAt: any, updatedAt: any, entries: Array<{ __typename?: 'JournalEntry', id: string, amount: number, kind: JournalEntryKind, ledgerAccount: { __typename?: 'LedgerAccount', id: string, name: string } }> } };

export type UpdateTransactionMutationVariables = Exact<{
  input: UpdateTransactionInput;
}>;


export type UpdateTransactionMutation = { __typename?: 'Mutation', updateTransaction: { __typename?: 'Transaction', id: string, date: any, description: string, createdAt: any, updatedAt: any, entries: Array<{ __typename?: 'JournalEntry', id: string, amount: number, kind: JournalEntryKind, ledgerAccount: { __typename?: 'LedgerAccount', id: string, name: string } }> } };


export const PeriodicExpensesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PeriodicExpenses"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"weekStart"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"weekEnd"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"monthStart"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"monthEnd"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"yearStart"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"yearEnd"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"thisWeek"},"name":{"kind":"Name","value":"periodAggregation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"weekStart"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"weekEnd"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"expenses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"thisMonth"},"name":{"kind":"Name","value":"periodAggregation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"monthStart"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"monthEnd"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"expenses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"thisYear"},"name":{"kind":"Name","value":"periodAggregation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"yearStart"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"yearEnd"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"expenses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}}]}}]}}]}}]} as unknown as DocumentNode<PeriodicExpensesQuery, PeriodicExpensesQueryVariables>;
export const ExpensesProportionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ExpensesProportion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"start"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"end"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"periodAggregation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"start"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"end"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"expenses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"byAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"ratio"}},{"kind":"Field","name":{"kind":"Name","value":"ledgerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<ExpensesProportionQuery, ExpensesProportionQueryVariables>;
export const MonthlyExpensesSeriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MonthlyExpensesSeries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"start"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"end"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"periodAggregationSeries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"start"}}},{"kind":"Argument","name":{"kind":"Name","value":"endDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"end"}}},{"kind":"Argument","name":{"kind":"Name","value":"granularity"},"value":{"kind":"EnumValue","value":"MONTHLY"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dataPoints"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"expenses"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"byAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalAmount"}},{"kind":"Field","name":{"kind":"Name","value":"ledgerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<MonthlyExpensesSeriesQuery, MonthlyExpensesSeriesQueryVariables>;
export const RecentTransactionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RecentTransactions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"last"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"last"},"value":{"kind":"Variable","name":{"kind":"Name","value":"last"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"ledgerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<RecentTransactionsQuery, RecentTransactionsQueryVariables>;
export const GetLedgerAccountsForCmdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerAccountsForCmd"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ledgerAccounts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"isGroup"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}}]}}]}}]} as unknown as DocumentNode<GetLedgerAccountsForCmdQuery, GetLedgerAccountsForCmdQueryVariables>;
export const GetLedgerAccountsForComboboxDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerAccountsForCombobox"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"kind"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"LedgerAccountKind"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ledgerAccounts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"kind"},"value":{"kind":"Variable","name":{"kind":"Name","value":"kind"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"isGroup"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}}]}}]}}]} as unknown as DocumentNode<GetLedgerAccountsForComboboxQuery, GetLedgerAccountsForComboboxQueryVariables>;
export const GetTransactionForModalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTransactionForModal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transaction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ledgerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}}]}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}}]}}]}}]}}]} as unknown as DocumentNode<GetTransactionForModalQuery, GetTransactionForModalQueryVariables>;
export const CreateTransactionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTransaction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateTransactionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTransaction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ledgerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}}]}}]}}]}}]} as unknown as DocumentNode<CreateTransactionMutation, CreateTransactionMutationVariables>;
export const UpdateTransactionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTransaction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateTransactionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTransaction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ledgerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateTransactionMutation, UpdateTransactionMutationVariables>;