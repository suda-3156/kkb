import { useQuery } from "@apollo/client/react"
import { useAtomValue } from "jotai"
import * as React from "react"
import { Controller, type useForm } from "react-hook-form"
import { toast } from "sonner"
import { LoadingInline } from "@/components/loading"
import { settingsAtom } from "@/components/settings/state"
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
import { matchesQuery } from "@/lib/search"

// biome-ignore lint/suspicious/noExplicitAny: shared generic helper
type AnyForm = ReturnType<typeof useForm<any>>

export const GetLedgerAccountsForComboboxDoc = graphql(/* GraphQL */ `
  query GetLedgerAccountsForCombobox($first: Int!, $after: ID, $kind: LedgerAccountKind) {
    ledgerAccounts(first: $first, after: $after, kind: $kind) {
      nodes {
        id
        name
        kind
        isGroup
        createdAt
        lastUsedAt
        lastRecordedAt
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
  /**
   * A single kind is filtered by the server; a list has to be fetched
   * unfiltered and narrowed client-side, because the query only takes one kind.
   */
  kind?: LedgerAccountKind | readonly LedgerAccountKind[]

  form: AnyForm
}

export const SelectLedgerAccountField = ({ name, label, kind, form }: Props) => {
  const id = React.useId()

  const serverKind = Array.isArray(kind) ? undefined : (kind as LedgerAccountKind | undefined)

  const { data, loading, error, fetchMore } = useQuery(GetLedgerAccountsForComboboxDoc, {
    variables: { first: 100, kind: serverKind },
  })

  React.useEffect(() => {
    if (!loading && data?.ledgerAccounts.pageInfo.hasNextPage) {
      fetchMore({
        variables: {
          first: 100,
          after: data.ledgerAccounts.pageInfo.endCursor,
          kind: serverKind,
        },
      })
    }

    if (!loading && error) {
      toast.error("科目の情報の取得に失敗しました")
    }
  }, [loading, data, fetchMore, serverKind, error])

  const { accountOrder } = useAtomValue(settingsAtom)

  // fetchMore rebuilds the array every time; keep the reference stable to avoid refiltering
  const groups = React.useMemo(
    () => buildAccountGroups(data?.ledgerAccounts.nodes, kind, accountOrder),
    [data, kind, accountOrder],
  )

  const findById = React.useCallback(
    (id: string) => groups.flatMap((group) => group.items).find((item) => item.id === id) ?? null,
    [groups],
  )

  // Only show spinner on initial load; fetchMore loading does not block the UI
  const isInitialLoading = loading && !data

  // Base UI does not handle Tab at all: it lets the browser move focus, then closing
  // restores the input to the selected label — an empty string while only a highlight
  // exists. Track the highlight so Tab can confirm the candidate the user is looking
  // at, the same as Enter already does. Cleared for us when the list closes, because
  // Base UI emits an undefined highlight along with the reset of the active index.
  const highlightedRef = React.useRef<AccountOption | null>(null)

  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
          <Combobox
            items={groups}
            autoHighlight
            // The default filter is an Intl.Collator substring match, which misses
            // anything typed across kana scripts or latin. The filter prop is the
            // only way to replace it.
            filter={(item: AccountOption | null, query: string) =>
              matchesQuery(item?.name ?? "", query)
            }
            value={findById(field.value)}
            onValueChange={(val: AccountOption | null) => field.onChange(val?.id ?? null)}
            onItemHighlighted={(item: AccountOption | null | undefined) => {
              highlightedRef.current = item ?? null
            }}
            itemToStringLabel={(item) => item?.name ?? ""}
            // items is a new instance after every fetch, so selection is decided by id
            itemToStringValue={(item) => item?.id ?? ""}
            isItemEqualToValue={(item, value) => item?.id === value?.id}
          >
            <ComboboxInput
              id={id}
              className="w-[90%]"
              aria-invalid={fieldState.invalid}
              placeholder="科目を選択"
              // Tabbing out of a field commits its highlighted candidate. Shift+Tab
              // counts too: either direction means the user is done with this field.
              onKeyDown={(event) => {
                if (event.key !== "Tab") return
                const item = highlightedRef.current
                if (item) field.onChange(item.id)
              }}
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
                  {/* Filtering only works through Collection. Never render the items by hand */}
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
