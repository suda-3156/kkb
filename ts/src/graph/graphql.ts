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

export type Query = {
  __typename?: 'Query';
  childAccountBreakdown: ChildAccountBreakdown;
  healthCheck: Scalars['String']['output'];
  ledgerAccount?: Maybe<LedgerAccount>;
  ledgerAccounts: LedgerAccountConnection;
  node?: Maybe<Node>;
  periodAggregation: PeriodAggregation;
  transaction?: Maybe<Transaction>;
  transactions: TransactionConnection;
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

export type ListTransactionsQueryVariables = Exact<{
  first: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['ID']['input']>;
  startDate: Scalars['Date']['input'];
}>;


export type ListTransactionsQuery = { __typename?: 'Query', transactions: { __typename?: 'TransactionConnection', nodes?: Array<{ __typename?: 'Transaction', id: string, date: any, description: string, entries: Array<{ __typename?: 'JournalEntry', id: string, amount: number, kind: JournalEntryKind, ledgerAccount: { __typename?: 'LedgerAccount', id: string, name: string, kind: LedgerAccountKind } }> } | null> | null, pageInfo: { __typename?: 'PageInfo', endCursor?: string | null, hasNextPage: boolean } } };

export type GetLedgerAccountsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLedgerAccountsQuery = { __typename?: 'Query', ledgerAccounts: { __typename?: 'LedgerAccountConnection', nodes?: Array<{ __typename?: 'LedgerAccount', id: string, name: string, kind: LedgerAccountKind, isGroup: boolean } | null> | null } };

export type CreateTransactionMutationVariables = Exact<{
  input: CreateTransactionInput;
}>;


export type CreateTransactionMutation = { __typename?: 'Mutation', createTransaction: { __typename?: 'Transaction', id: string, date: any, description: string, entries: Array<{ __typename?: 'JournalEntry', id: string, amount: number, kind: JournalEntryKind, ledgerAccount: { __typename?: 'LedgerAccount', id: string, name: string } }> } };


export const ListTransactionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListTransactions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"startDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"startDate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"ledgerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endCursor"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]}}]} as unknown as DocumentNode<ListTransactionsQuery, ListTransactionsQueryVariables>;
export const GetLedgerAccountsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ledgerAccounts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"isGroup"}}]}}]}}]}}]} as unknown as DocumentNode<GetLedgerAccountsQuery, GetLedgerAccountsQueryVariables>;
export const CreateTransactionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTransaction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateTransactionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTransaction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"ledgerAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CreateTransactionMutation, CreateTransactionMutationVariables>;