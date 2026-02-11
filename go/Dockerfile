# Docker image for Go API Development
FROM golang:1.25-alpine

WORKDIR /app

RUN apk update && apk upgrade && \
    apk add --no-cache git curl bash

RUN go install github.com/air-verse/air@latest

EXPOSE 8080

CMD ["air", "-c", ".air.toml"]
