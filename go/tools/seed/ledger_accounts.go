package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	graph "github.com/suda-3156/kkb/go/graph/model"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/prid"
)

type LedgerAccount struct {
	Name    string `json:"name"`
	Parent  string `json:"parent,omitempty"` // Parent account name, empty if top-level
	Type    string `json:"type"`             // "ASSET", "LIABILITY", "EQUITY", "REVENUE", or "EXPENSE"
	IsGroup bool   `json:"is_group"`         // true if this account is a group account
}

func insertLedgerAccounts(
	ctx context.Context,
	lac *ledgeraccount.LedgerAccountManager,
) (map[string]prid.ID, error) {
	var seeds []LedgerAccount

	ledgeraccountsJSON, err := os.ReadFile(ledgerAccountsSeedPath)
	if err != nil {
		return nil, fmt.Errorf("read JSON: %w", err)
	}

	if err := json.Unmarshal(ledgeraccountsJSON, &seeds); err != nil {
		return nil, fmt.Errorf("insertLedgerAccounts: parse JSON: %w", err)
	}

	accountMap := make(map[string]prid.ID, len(seeds))

	logging.Info(ctx, "inserting ledger accounts", "count", len(seeds))

	for i, s := range seeds {
		kind := graph.LedgerAccountKind(s.Type)
		if !kind.IsValid() {
			return nil, fmt.Errorf("insertLedgerAccounts[%d] %q: unknown type %q", i, s.Name, s.Type)
		}

		var parentID *prid.ID
		if s.Parent != "" {
			id, ok := accountMap[s.Parent]
			if !ok {
				return nil, fmt.Errorf("insertLedgerAccounts[%d] %q: parent %q not found (must appear before child in JSON)", i, s.Name, s.Parent)
			}
			parentID = &id
		}

		a, err := createAccount(ctx, lac, s.Name, kind, s.IsGroup, parentID)
		if err != nil {
			return nil, err
		}
		accountMap[a.Name] = a.ID
	}

	return accountMap, nil
}

func createAccount(
	ctx context.Context,
	lac *ledgeraccount.LedgerAccountManager,
	name string,
	kind graph.LedgerAccountKind,
	isGroup bool,
	parentID *prid.ID,
) (*graph.LedgerAccount, error) {
	a, err := lac.Create(ctx, graph.CreateLedgerAccountInput{
		Name:     name,
		Kind:     kind,
		IsGroup:  isGroup,
		ParentID: parentID,
	})
	if err != nil {
		return nil, fmt.Errorf("create %q: %w", name, err)
	}

	logging.Info(ctx, "created ledger account", "name", name, "id", a.ID)
	return a, nil
}
