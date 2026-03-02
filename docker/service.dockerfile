# Docker image for API Service

# Step 1: Modules caching
FROM golang:1.25-alpine AS modules

ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

WORKDIR /app
COPY ./go.mod ./
COPY ./go.sum ./

RUN --mount=type=cache,target=/go/pkg/mod/ \
    go mod download -x

COPY ./go ./

# Step 2: Server building
FROM modules AS builder
RUN --mount=type=cache,target=/go/pkg/mod/ \
    go build -o /bin/server ./cmd/api/main.go

# Step 3: Final image
FROM gcr.io/distroless/static-debian12:latest-amd64

COPY --from=builder /bin/server /bin/server

EXPOSE 8080
CMD ["/bin/server"]