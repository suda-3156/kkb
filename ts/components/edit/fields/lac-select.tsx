import { useQuery } from "@apollo/client/react"
import * as React from "react"
import { Controller, type useForm } from "react-hook-form"
import { toast } from "sonner"
import { LoadingInline } from "@/components/loading"
import {
  Combobox,
  ComboboxCollection,
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
import type { LedgerAccountKind } from "@/graph/graphql"
import {
  type AccountGroup,
  type AccountOption,
  buildAccountGroups,
  KIND_LABELS,
} from "@/lib/lac-options"

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

  // fetchMore のたびに配列が作り直されるので、参照を安定させて再フィルタを避ける
  const groups = React.useMemo(
    () => buildAccountGroups(data?.ledgerAccounts.nodes, kind),
    [data, kind],
  )

  const findById = React.useCallback(
    (id: string) => groups.flatMap((group) => group.items).find((item) => item.id === id) ?? null,
    [groups],
  )

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
            items={groups}
            autoHighlight
            value={findById(field.value)}
            onValueChange={(val: AccountOption | null) => field.onChange(val?.id ?? null)}
            itemToStringLabel={(item) => item?.name ?? ""}
            // items は再取得のたびに別インスタンスになるため、選択状態は id で判定する
            itemToStringValue={(item) => item?.id ?? ""}
            isItemEqualToValue={(item, value) => item?.id === value?.id}
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
                  <ComboboxEmpty>科目が見つかりません</ComboboxEmpty>
                  {/* 絞り込みは Collection を通したときだけ効く。手で items を描画してはいけない */}
                  <ComboboxList>
                    {(group: AccountGroup) => (
                      <ComboboxGroup key={group.value} items={group.items}>
                        <ComboboxLabel>{KIND_LABELS[group.value]}</ComboboxLabel>
                        <ComboboxCollection>
                          {(item: AccountOption) => (
                            <ComboboxItem key={item.id} value={item}>
                              {item.name}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxGroup>
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
