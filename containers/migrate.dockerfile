# Docker image for Migration Job

# Step 1: Modules caching
FROM golang:1.27-alpine@sha256:4c9fe60190a2a3350ddc51de80d0224b8a6698d12bdfc999fee45ea9d6c46dbc AS modules

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
FROM gcr.io/distroless/static-debian12:latest-amd64@sha256:6d635b323e6ab633016668144d38e368e2894bd824500369151573225078ee03

COPY --from=builder /bin/migration /bin/migration
COPY --from=builder /usr/local/bin/atlas /bin/atlas
COPY --from=builder /db/migrations /db/migrations

CMD ["/bin/migration"]
