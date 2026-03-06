// ledger accountの新規作成と編集のモーダル
// open/closeはjotaiでグローバルに管理し、編集モードで開くときはledger account idが渡される。
// collocationにしたいので、このモーダルでledger accountの内容を取得して表示する。

// 編集内容やロジックは schema/*.graphql, go/internal/ledgeraccount/*.goを参照
// 新規作成時や親変更時など、ledger accountはツリー構造で表示したい。 (bunx shadcn@latest add @kibo-ui/tree)
// createTransactionを支出と収入でラップしたようなことはせず、割と直接graphqlのmutationを呼び出す形で実装する予定。
