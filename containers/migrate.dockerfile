# Docker image for Migration Job

# Step 1: Modules caching
FROM golang:1.25-alpine@sha256:56961d79ea8129efddcc0b8643fd8a5416b4e6228cfd477e3fd61deb2672c587 AS modules

ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

RUN apk add --no-cache curl

WORKDIR /app
COPY ./go/go.mod ./
COPY ./go/go.sum ./

RUN --mount=type=cache,target=/go/pkg/mod/ \
  go mod download -x

COPY ./go ./

RUN curl -sSf https://atlasgo.sh | sh -s -- -y --platform linux-amd64

# Step 2: Server building
FROM modules AS builder
RUN --mount=type=cache,target=/go/pkg/mod/ \
  go build -o /bin/migration ./cmd/migrate/main.go

COPY ./db/migrations /db/migrations

# Step 3: Final image
FROM gcr.io/distroless/static-debian12:latest-amd64@sha256:597c2b4bc7f353100af9b8b06bb4f126c4a45f9d8175e25d4f01f965d5d94396

COPY --from=builder /bin/migration /bin/migration
COPY --from=builder /usr/local/bin/atlas /bin/atlas
COPY --from=builder /db/migrations /db/migrations

CMD ["/bin/migration"]
