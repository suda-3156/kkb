import { useQuery } from "@apollo/client/react"
import * as React from "react"
import { Controller, type useForm } from "react-hook-form"
import { toast } from "sonner"
import { LoadingInline } from "@/components/loading"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { graphql } from "@/graph"
import { LedgerAccountKind } from "@/graph/graphql"

const KIND_LABELS: Record<LedgerAccountKind, string> = {
  [LedgerAccountKind.Asset]: "資産",
  [LedgerAccountKind.Liability]: "負債",
  [LedgerAccountKind.Expense]: "費用",
  [LedgerAccountKind.Revenue]: "収益",
  [LedgerAccountKind.Equity]: "純資産",
}

const KIND_ORDER: LedgerAccountKind[] = [
  LedgerAccountKind.Asset,
  LedgerAccountKind.Liability,
  LedgerAccountKind.Expense,
  LedgerAccountKind.Revenue,
  LedgerAccountKind.Equity,
]

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
  label?: string
  kind?: LedgerAccountKind

  form: AnyForm
}

export const SelectLedgerAccountField = ({ name, label, kind, form }: Props) => {
  const { data, loading, error, fetchMore } = useQuery(GetLedgerAccountsForComboboxDoc, {
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

    if (!loading && error) {
      toast.error("科目の情報の取得に失敗しました")
    }
  }, [loading, data, fetchMore, kind, error])

  const items: Account[] =
    data?.ledgerAccounts.nodes?.filter(
      (account): account is NonNullable<typeof account> => account != null && !account.isGroup,
    ) ?? []

  // Only show spinner on initial load; fetchMore loading does not block the UI
  const isInitialLoading = loading && !data

  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          {label && <FieldLabel>{label}</FieldLabel>}
          <Combobox
            items={items}
            autoHighlight
            onValueChange={(val: Account | null) => field.onChange(val?.id ?? null)}
            itemToStringLabel={(item) => item?.name ?? ""}
          >
            <ComboboxInput
              className="w-[90%]"
              aria-invalid={fieldState.invalid}
              placeholder="科目を選択"
            />
            <ComboboxContent>
              {isInitialLoading && (
                <div className="py-2">
                  <LoadingInline className="mb-4" />
                </div>
              )}
              {!isInitialLoading && (
                <>
                  <ComboboxEmpty>"科目が見つかりません"</ComboboxEmpty>
                  <ComboboxList>
                    {kind ? (
                      <ComboboxGroup>
                        <ComboboxLabel>{KIND_LABELS[kind]}</ComboboxLabel>
                        {items.map((item) => (
                          <ComboboxItem key={item.id} value={item}>
                            {item.name}
                          </ComboboxItem>
                        ))}
                      </ComboboxGroup>
                    ) : (
                      KIND_ORDER.map((k) => {
                        const groupItems = items.filter((item) => item.kind === k)
                        if (groupItems.length === 0) return null
                        return (
                          <ComboboxGroup key={k}>
                            <ComboboxLabel>{KIND_LABELS[k]}</ComboboxLabel>
                            {groupItems.map((item) => (
                              <ComboboxItem key={item.id} value={item}>
                                {item.name}
                              </ComboboxItem>
                            ))}
                          </ComboboxGroup>
                        )
                      })
                    )}
                  </ComboboxList>
                </>
              )}
            </ComboboxContent>
          </Combobox>
          {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
        </Field>
      )}
    />
  )
}
