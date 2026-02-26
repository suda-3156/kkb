package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"

	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/pulid"
	transaction "github.com/suda-3156/kkb/go/internal/transaction"
)

//go:embed data/ledgeraccounts.json
var ledgeraccountsJSON []byte

//go:embed data/transactions.json
var transactionsJSON []byte

type LedgerAccount struct {
	Name    string `json:"name"`
	Parent  string `json:"parent,omitempty"` // Parent account name, empty if top-level
	Type    string `json:"type"`             // "ASSET", "LIABILITY", "EQUITY", "REVENUE", or "EXPENSE"
	IsGroup bool   `json:"is_group"`         // true if this account is a group account
}

type Transaction struct {
	Date        string  `json:"date"`
	Description string  `json:"description"`
	Entries     []Entry `json:"entries"`
}

type Entry struct {
	Account string `json:"account"` // Account name must exist in accountMap
	Amount  int32  `json:"amount"`
	Kind    string `json:"kind"` // "DEBIT" or "CREDIT"
}

func insertData(ctx context.Context, lac *ledgeraccount.LedgerAccountManager, tm *transaction.TransactionManager) error {
	accountMap, err := insertLedgerAccounts(ctx, lac)
	if err != nil {
		return fmt.Errorf("insertData: insert ledger accounts: %w", err)
	}

	if err := insertTransactions(ctx, tm, accountMap); err != nil {
		return fmt.Errorf("insertData: insert transactions: %w", err)
	}

	return nil
}

func insertLedgerAccounts(ctx context.Context, lac *ledgeraccount.LedgerAccountManager) (map[string]pulid.ID, error) {
	var seeds []LedgerAccount
	if err := json.Unmarshal(ledgeraccountsJSON, &seeds); err != nil {
		return nil, fmt.Errorf("insertLedgerAccounts: parse JSON: %w", err)
	}

	// typeStr → LedgerAccountKind のマッピング
	kindMap := map[string]graph.LedgerAccountKind{
		"ASSET":     graph.LedgerAccountKindAsset,
		"LIABILITY": graph.LedgerAccountKindLiability,
		"EXPENSE":   graph.LedgerAccountKindExpense,
		"REVENUE":   graph.LedgerAccountKindRevenue,
		"EQUITY":    graph.LedgerAccountKindEquity,
	}

	accountMap := make(map[string]pulid.ID, len(seeds))

	logging.Info(ctx, "inserting ledger accounts", "count", len(seeds))

	for i, s := range seeds {
		kind, ok := kindMap[s.Type]
		if !ok {
			return nil, fmt.Errorf("insertLedgerAccounts[%d] %q: unknown type %q", i, s.Name, s.Type)
		}

		var parentID *pulid.ID
		if s.Parent != "" {
			id, ok := accountMap[s.Parent]
			if !ok {
				return nil, fmt.Errorf("insertLedgerAccounts[%d] %q: parent %q not found (must appear before child in JSON)", i, s.Name, s.Parent)
			}
			parentID = &id
		}

		a, err := create(ctx, lac, s.Name, kind, s.IsGroup, parentID)
		if err != nil {
			return nil, err
		}
		accountMap[a.Name] = a.ID
	}

	return accountMap, nil
}

func insertTransactions(
	ctx context.Context,
	tm *transaction.TransactionManager,
	accountMap map[string]pulid.ID,
) error {
	var seeds []Transaction
	if err := json.Unmarshal(transactionsJSON, &seeds); err != nil {
		return fmt.Errorf("insertTransactions: parse JSON: %w", err)
	}

	logging.Info(ctx, "inserting sample transactions", "count", len(seeds))

	for i, s := range seeds {
		d, err := date.NewDate(s.Date)
		if err != nil {
			return fmt.Errorf("insertTransactions[%d]: invalid date %q: %w", i, s.Date, err)
		}

		entries := make([]*graph.JournalEntryInput, 0, len(s.Entries))
		for j, e := range s.Entries {
			id, ok := accountMap[e.Account]
			if !ok {
				return fmt.Errorf("insertTransactions[%d].entries[%d]: unknown account %q", i, j, e.Account)
			}

			kind := graph.JournalEntryKind(e.Kind)
			if !kind.IsValid() {
				return fmt.Errorf("insertTransactions[%d].entries[%d]: invalid kind %q", i, j, e.Kind)
			}

			entries = append(entries, &graph.JournalEntryInput{
				LedgerAccountID: id,
				Amount:          e.Amount,
				Kind:            kind,
			})
		}

		input := graph.CreateTransactionInput{
			Date:        *d,
			Description: s.Description,
			Entries:     entries,
		}

		txn, err := tm.Create(ctx, input)
		if err != nil {
			return fmt.Errorf("insertTransactions[%d] %q: %w", i, s.Description, err)
		}

		logging.Info(ctx, "created transaction",
			"index", i+1,
			"id", txn.ID,
			"date", s.Date,
			"description", s.Description,
		)
	}

	logging.Info(ctx, "all sample transactions inserted successfully", "total", len(seeds))
	return nil
}
