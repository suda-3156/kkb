import { gql } from "@apollo/client"
import { graphql } from "@/graph"

/**
 * 取引を記録した直後に、勘定科目の直近利用をキャッシュへ書き戻すための断片。
 *
 * codegen の `graphql()` ではなく `gql` を使うのは、client-preset の fragment 型が
 * マスクされていて `cache.writeFragment` にそのまま渡せないため。書き込むのは
 * 3 フィールドだけなので、型の後ろ盾が無くても見通しは落ちない。
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
