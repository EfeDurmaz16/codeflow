# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git make

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binaries
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/codeflow-daemon ./cmd/daemon
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/codeflow ./cmd/cli

# Development stage (with hot reload)
FROM golang:1.22-alpine AS development

WORKDIR /app

# Install development tools
RUN apk add --no-cache git make
RUN go install github.com/cosmtrek/air@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Air config for hot reload
COPY .air.toml .

CMD ["air"]

# Production stage
FROM alpine:3.19 AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Copy binaries from builder
COPY --from=builder /app/bin/codeflow-daemon /usr/local/bin/
COPY --from=builder /app/bin/codeflow /usr/local/bin/

# Create non-root user
RUN addgroup -g 1000 codeflow && \
    adduser -u 1000 -G codeflow -s /bin/sh -D codeflow

USER codeflow

# Expose ports
EXPOSE 5555 5556

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:5555/health || exit 1

ENTRYPOINT ["codeflow-daemon"]
