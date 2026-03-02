import { useQuery } from "@apollo/client/react"
import * as React from "react"
import { Controller, type useForm } from "react-hook-form"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { graphql } from "@/graph"
import type { LedgerAccountKind } from "@/graph/graphql"

// biome-ignore lint/suspicious/noExplicitAny: shared generic helper
type AnyForm = ReturnType<typeof useForm<any>>

const GetLedgerAccountsForComboboxDoc = graphql(/* GraphQL */ `
  query GetLedgerAccountsForCombobox($first: Int!, $after: ID, $kind: LedgerAccountKind) {
    ledgerAccounts(first: $first, after: $after, kind: $kind) {
      nodes {
        id
        name
        kind
        isGroup
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`)

type Account = {
  id: string
  name: string
  kind: LedgerAccountKind
  isGroup: boolean
}

type Props = {
  name: string
  label: string
  kind?: LedgerAccountKind

  form: AnyForm
}

export const SelectLedgerAccountField = ({ name, label, kind, form }: Props) => {
  const { data, loading, fetchMore } = useQuery(GetLedgerAccountsForComboboxDoc, {
    variables: { first: 100, kind },
  })

  React.useEffect(() => {
    if (!loading && data?.ledgerAccounts.pageInfo.hasNextPage) {
      fetchMore({
        variables: {
          first: 100,
          after: data.ledgerAccounts.pageInfo.endCursor,
          kind,
        },
      })
    }
  }, [loading, data, fetchMore, kind])

  const items: Account[] =
    data?.ledgerAccounts.nodes?.filter(
      (account): account is NonNullable<typeof account> => account != null && !account.isGroup,
    ) ?? []

  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>
          <Combobox
            items={items}
            autoHighlight
            onValueChange={(val: Account | null) => field.onChange(val?.id ?? null)}
            itemToStringLabel={(item) => item?.name ?? ""}
          >
            <ComboboxInput aria-invalid={fieldState.invalid} placeholder="科目を選択" />
            <ComboboxContent>
              <ComboboxEmpty>科目が見つかりません</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item.id} value={item}>
                    {item.name}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
        </Field>
      )}
    />
  )
}
