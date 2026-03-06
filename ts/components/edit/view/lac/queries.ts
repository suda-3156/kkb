import { graphql } from "@/graph"

export const GetLedgerAccountsDoc = graphql(/* GraphQL */ `
  query GetLedgerAccounts ($first: Int!, $after: ID) {
    ledgerAccounts(first: $first, after: $after, includeArchived: true) {
      nodes {
        id
        name
        kind
        isGroup
        archivedAt
        updatedAt
        parent {
          id
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`)

export const ArchiveLedgerAccountDoc = graphql(/* GraphQL */ `
  mutation ArchiveLedgerAccount($id: ID!) {
    archiveLedgerAccount(id: $id) {
      id
      archivedAt
    }
  }
`)

export const UnarchiveLedgerAccountDoc = graphql(/* GraphQL */ `
  mutation UnarchiveLedgerAccount($id: ID!) {
    unarchiveLedgerAccount(id: $id) {
      id
      archivedAt
    }
  }
`)

export const UpdateLedgerAccountDoc = graphql(/* GraphQL */ `
  mutation UpdateLedgerAccount($input: UpdateLedgerAccountInput!) {
    updateLedgerAccount(input: $input) {
      id
      name
      parent {
        id
      }
    }
  }
`)

export const CreateLedgerAccountDoc = graphql(/* GraphQL */ `
  mutation CreateLedgerAccount($input: CreateLedgerAccountInput!) {
    createLedgerAccount(input: $input) {
      id
      name
      kind
      isGroup
      updatedAt
      parent {
        id
      }
    }
  }
`)
