# CodeFlow Orchestrator - Build Automation
# =========================================

.PHONY: all build build-daemon build-cli run run-daemon run-cli test lint clean install dev docker-build docker-up docker-down

# Variables
BINARY_DIR := bin
DAEMON_BINARY := $(BINARY_DIR)/codeflow-daemon
CLI_BINARY := $(BINARY_DIR)/codeflow
GO := go
GOFLAGS := -v
LDFLAGS := -s -w

# Version info
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
BUILD_TIME := $(shell date -u '+%Y-%m-%dT%H:%M:%SZ')
LDFLAGS += -X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME)

# Default target
all: build

# Build both binaries
build: build-daemon build-cli

build-daemon:
	@echo "🔨 Building daemon..."
	@mkdir -p $(BINARY_DIR)
	$(GO) build $(GOFLAGS) -ldflags "$(LDFLAGS)" -o $(DAEMON_BINARY) ./cmd/daemon

build-cli:
	@echo "🔨 Building CLI..."
	@mkdir -p $(BINARY_DIR)
	$(GO) build $(GOFLAGS) -ldflags "$(LDFLAGS)" -o $(CLI_BINARY) ./cmd/cli

# Run commands
run: run-daemon

run-daemon: build-daemon
	@echo "🚀 Starting daemon..."
	$(DAEMON_BINARY)

run-cli: build-cli
	$(CLI_BINARY) $(ARGS)

# Development mode with hot reload
dev:
	@echo "🔄 Starting development mode..."
	@which air > /dev/null || (echo "Installing air..." && go install github.com/cosmtrek/air@latest)
	air

# Testing
test:
	@echo "🧪 Running tests..."
	$(GO) test -v -race -cover ./...

test-coverage:
	@echo "📊 Generating coverage report..."
	$(GO) test -v -race -coverprofile=coverage.out ./...
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

# Linting
lint:
	@echo "🔍 Running linter..."
	@which golangci-lint > /dev/null || (echo "Installing golangci-lint..." && go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest)
	golangci-lint run ./...

# Formatting
fmt:
	@echo "✨ Formatting code..."
	$(GO) fmt ./...
	gofumpt -l -w .

# Clean build artifacts
clean:
	@echo "🧹 Cleaning..."
	rm -rf $(BINARY_DIR)
	rm -f coverage.out coverage.html

# Install to system
install: build
	@echo "📦 Installing to /usr/local/bin..."
	sudo cp $(CLI_BINARY) /usr/local/bin/codeflow
	sudo cp $(DAEMON_BINARY) /usr/local/bin/codeflow-daemon

# Docker commands
docker-build:
	@echo "🐳 Building Docker image..."
	docker build -t codeflow/orchestrator:$(VERSION) .

docker-up:
	@echo "🐳 Starting Docker Compose..."
	docker compose up -d

docker-down:
	@echo "🐳 Stopping Docker Compose..."
	docker compose down

docker-logs:
	docker compose logs -f

# Initialize project in current directory
init:
	@echo "📁 Initializing CodeFlow project..."
	@mkdir -p .codeflow .tasks/active .tasks/completed .tasks/blocked .planning .walkthroughs .agents
	@echo "✅ CodeFlow project initialized!"

# Dependencies
deps:
	@echo "📦 Installing dependencies..."
	$(GO) mod download
	$(GO) mod tidy

# Generate (if needed for future)
generate:
	@echo "⚙️ Generating code..."
	$(GO) generate ./...

# Help
help:
	@echo "CodeFlow Orchestrator - Available Commands:"
	@echo ""
	@echo "  make build        - Build both daemon and CLI"
	@echo "  make run          - Build and run daemon"
	@echo "  make test         - Run all tests"
	@echo "  make lint         - Run linter"
	@echo "  make clean        - Remove build artifacts"
	@echo "  make docker-up    - Start Docker services"
	@echo "  make docker-down  - Stop Docker services"
	@echo "  make init         - Initialize CodeFlow in current directory"
	@echo "  make help         - Show this help message"
