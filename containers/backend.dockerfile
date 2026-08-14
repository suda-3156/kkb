# Docker image for the Go backend: the API service (/bin/server, default CMD)
# and the daily tasks job (/bin/job, used by the kkb-tasks Cloud Run Job via a
# command override). One image keeps the job's shared logic (subscription
# materialization) at the same version as the deployed API.

# Step 1: Modules caching
FROM golang:1.26-alpine@sha256:70b46548e42db77e0966aaf3619fd068734dc6c77584d526b91126504fd95816 AS modules

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
FROM gcr.io/distroless/static-debian12:latest-amd64@sha256:f0d7eda44aeaf164db7ac8e6672c1f8b0a79bd52c1990099c4250a3ef9f3d543

COPY --from=builder /bin/server /bin/server
COPY --from=builder /bin/job /bin/job

EXPOSE 8080
CMD ["/bin/server"]
