import { gql } from "@apollo/client"
import { graphql } from "@/graph"

/**
 * Fragment used to write an account's last use back into the cache right after a
 * transaction is recorded.
 *
 * It uses `gql` rather than codegen's `graphql()` because client-preset masks its
 * fragment types, which `cache.writeFragment` will not accept. Only three fields are
 * written, so losing the type is not much of a loss.
 */
export const LedgerAccountLastUsedFragment = gql`
  fragment LedgerAccountLastUsed on LedgerAccount {
    id
    lastUsedAt
    lastRecordedAt
  }
`

export const CreateTransactionDoc = graphql(/* GraphQL */ `
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      id
      date
      description
      createdAt
      updatedAt
      entries {
        ledgerAccount {
          id
          name
        }
        amount
        kind
      }
    }
  }
`)

export const DeleteTransactionDoc = graphql(/* GraphQL */ `
  mutation DeleteTransaction($id: ID!) {
    deleteTransaction(id: $id) {
      success
    }
  }
`)

export const UpdateTransactionDoc = graphql(/* GraphQL */ `
  mutation UpdateTransaction($input: UpdateTransactionInput!) {
    updateTransaction(input: $input) {
      id
      date
      description
      createdAt
      updatedAt
      entries {
        ledgerAccount {
          id
          name
        }
        amount
        kind
      }
    }
  }
`)
