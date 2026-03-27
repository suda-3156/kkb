# KKB

A budget book with Next.js, GraphQL, Golang, ent., MySQL.

## Local development

### With `direnv` and `go-task`

- Requirements
    - direnv
    - docker
    - bun
    - [go-task/task](https://github.com/go-task/task/)
    - python

- Steps

```sh
direnv allow
mise trust # With mise
task init
task start:all
```

-> Open `http://localhost:3000/`.

### Without them

- Requirements
    - docker
    - bun (Or Node.js)
    - python

- Steps

```sh
# Configure env variables
cp .env.example .env.local
source .env.local

# Initialization
mkdir -p ./db/docker/logs;
touch ./db/docker/logs/mysql-error.log;
touch ./db/docker/logs/mysql-slow.log;
touch ./db/docker/logs/mysql-query.log;
docker compose up -d
python go/tools/seed/data/generate_transactions.py
mkdir -p go/local/secrets
tr -dc A-Za-z0-9 </dev/urandom | head -c 16 >go/local/secrets/encryption_aad
docker compose exec api bash -c "go run ./tools/seed/"

# Reload the api server and boot the Next.js
docker compose up -d api
cd ts
bun dev
```

## Repositories I used as references

- [google/exposure-notifications-server](https://github.com/google/exposure-notifications-server)
- [saki-engineering/graphql-sample](https://github.com/saki-engineering/graphql-sample)

