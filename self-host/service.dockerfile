# Self-host Go API image (arm64 / Raspberry Pi 5).
# Build context: repository root (set in docker-compose: build.context = ..).
# Produces two static binaries: the API server and the one-shot key bootstrap.
# No GOARCH pin -> builds for the host/buildx target platform (arm64 on a Pi).

FROM golang:1.25-alpine AS builder
ENV CGO_ENABLED=0
WORKDIR /src

COPY go/go.mod go/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod/ \
    go mod download

COPY go/ ./
RUN --mount=type=cache,target=/go/pkg/mod/ \
    go build -o /out/server ./cmd/api && \
    go build -o /out/bootstrap ./cmd/bootstrap

# Minimal, non-root runtime. Multi-arch manifest -> resolves to arm64 on a Pi.
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=builder /out/server /bin/server
COPY --from=builder /out/bootstrap /bin/bootstrap

EXPOSE 8080
# Default entrypoint is the API; the bootstrap service overrides it.
ENTRYPOINT ["/bin/server"]
