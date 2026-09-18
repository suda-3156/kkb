# Docker image for the Go backend: the API service (/bin/server, default CMD)
# and the daily tasks job (/bin/job, used by the kkb-tasks Cloud Run Job via a
# command override). One image keeps the job's shared logic (subscription
# materialization) at the same version as the deployed API.

# Step 1: Modules caching
FROM golang:1.27-alpine@sha256:4cb7ac979db5fcc41cae44b2227ba5ab8a51e8807f40d9ba4dee20a0ad960b5b AS modules

ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

WORKDIR /app
COPY ./go.mod ./
COPY ./go.sum ./

RUN --mount=type=cache,target=/go/pkg/mod/ \
	go mod download -x

COPY ./ ./

# Step 2: Server building
FROM modules AS builder
RUN --mount=type=cache,target=/go/pkg/mod/ \
	go build -o /bin/server ./cmd/api/main.go && \
	go build -o /bin/job ./cmd/job/main.go

# Step 3: Final image
FROM gcr.io/distroless/static-debian12:latest-amd64@sha256:6d635b323e6ab633016668144d38e368e2894bd824500369151573225078ee03

COPY --from=builder /bin/server /bin/server
COPY --from=builder /bin/job /bin/job

EXPOSE 8080
CMD ["/bin/server"]
