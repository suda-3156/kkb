# Docker image for Migration Job

# Step 1: Modules caching
FROM golang:1.26-alpine@sha256:70b46548e42db77e0966aaf3619fd068734dc6c77584d526b91126504fd95816 AS modules

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
FROM gcr.io/distroless/static-debian12:latest-amd64@sha256:f0d7eda44aeaf164db7ac8e6672c1f8b0a79bd52c1990099c4250a3ef9f3d543

COPY --from=builder /bin/migration /bin/migration
COPY --from=builder /usr/local/bin/atlas /bin/atlas
COPY --from=builder /db/migrations /db/migrations

CMD ["/bin/migration"]
