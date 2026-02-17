package resolver

import ledgeraccount "github.com/suda-3156/kkb/go/internal/usecase/ledger_account"

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require
// here.

type Resolver struct {
	Lac *ledgeraccount.LedgerAccountUseCase
}
