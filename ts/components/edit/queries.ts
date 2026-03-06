import { graphql } from "@/graph"

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
