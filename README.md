# KKB

Next.js, GraphQL, Golang, ent., MySQL を使用した家計簿

## ローカルでの立ち上げ(開発用)

### `task`や`direnv`を使用する場合

- Requirements
    - direnv
    - docker
    - bun
    - [go-task/task](https://github.com/go-task/task/)

- 方法

```sh
task init
task start:all
```

-> `http://localhost:3000/` を開く

### 使用しない場合

- Requirements
    - docker
    - bun (もしくは, Node.js, pnpm等)

- 方法

```sh
# 環境変数の設定
cp .env.example .env.local
source .env.local

# 初期化
mkdir -p ./db/docker/logs;
touch ./db/docker/logs/mysql-error.log;
touch ./db/docker/logs/mysql-slow.log;
touch ./db/docker/logs/mysql-query.log;
docker compose up -d
docker compose exec api bash -c "go run ./tools/seed/"

# サーバーのリロードとフロントエンドん起動
docker compose up -d api
cd ts
bun dev
```

## 参考にした主なリポジトリ

- [google/exposure-notifications-server](https://github.com/google/exposure-notifications-server)
- [saki-engineering/graphql-sample](https://github.com/saki-engineering/graphql-sample)

