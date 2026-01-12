# CodeFlow Orchestrator

<p align="center">
  <img src="docs/logo.png" alt="CodeFlow Logo" width="200">
</p>

<p align="center">
  <strong>Multi-Agent AI Coding Orchestrator</strong><br>
  <em>Coordinate Claude, Cursor, Windsurf, and more — in parallel, conflict-free</em>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#documentation">Documentation</a>
</p>

---

## 🎯 What is CodeFlow?

CodeFlow Orchestrator is a developer-first platform that allows multiple AI coding agents to work **in parallel** on the same codebase while maintaining synchronized state through a unified file structure.

### ✅ Core Value Proposition

- **Work with ANY agent** — Not locked into one ecosystem
- **Agents collaborate, not conflict** — CRDT-based conflict resolution
- **10x faster development** — Parallel task execution
- **Full transparency** — No black boxes, everything in YAML
- **Self-hosted or cloud** — Your choice

---

## 🚀 Quick Start

### Prerequisites

- Go 1.22+
- Docker & Docker Compose
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/codeflow/orchestrator.git
cd orchestrator

# Install dependencies
make deps

# Build binaries
make build

# Start services (PostgreSQL, Redis)
make docker-up

# Initialize a project
cd /your/project
codeflow init --name "my-project"

# Add an agent
codeflow agent add claude --api-key $ANTHROPIC_API_KEY

# Create your first task
codeflow task create "Build authentication system"

# Watch the magic
codeflow status --watch
```

---

## ✨ Features

### 🤖 Multi-Agent Support
- **Claude** (Anthropic API)
- **Cursor** (File watcher integration)
- **Windsurf** (API + file system)
- **Cline** (CLI wrapper)
- **Custom agents** (gRPC/REST API)

### 📁 YAML-First Design
```yaml
# .tasks/active/task-001-auth.yaml
id: "task-001"
name: "OAuth2 Authentication"
assigned_agents: ["claude", "windsurf"]
status: "active"
subtasks:
  - name: "Design architecture"
    assigned_to: "claude"
  - name: "Implement providers"
    assigned_to: "windsurf"
```

### ⚡ Conflict-Free Execution
- CRDT-based operational transformation
- Automatic merge of concurrent edits
- Validation pipeline (syntax → types → tests)
- Intelligent rollback on failure

### 🖥️ Beautiful TUI
- Modern terminal interface (Bubble Tea + Lipgloss)
- Real-time task progress
- Agent status monitoring
- Keyboard-first navigation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CodeFlow Orchestrator                     │
│                      (Core Engine - Go)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ File Format  │  │  Scheduler   │  │ Conflict Resolver │   │
│  │   Engine     │  │ & Coordinator│  │     (CRDT)        │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────▼────┐          ┌────▼────┐          ┌───▼────┐
    │ Claude  │          │ Cursor  │          │Windsurf│
    └─────────┘          └─────────┘          └────────┘
```

---

## 📁 Project Structure

```
my-project/
├── .codeflow/              # CodeFlow metadata
│   ├── project.yaml        # Project configuration
│   ├── agents.yaml         # Connected agents
│   └── state.db            # State snapshot
├── .tasks/                 # Task definitions
│   ├── active/
│   ├── completed/
│   └── blocked/
├── .planning/              # Strategic planning
│   ├── roadmap.yaml
│   └── architecture.yaml
└── .walkthroughs/          # Reproducible workflows
```

---

## 🛠️ CLI Commands

```bash
# Project management
codeflow init                    # Initialize in current directory
codeflow status --watch          # Real-time dashboard

# Task management
codeflow task create "..."       # Create new task
codeflow task list               # List active tasks
codeflow task assign 001 claude  # Assign agent

# Agent management
codeflow agent add claude        # Add an agent
codeflow agent list              # List connected agents
codeflow agent status            # Check agent health

# Workflow execution
codeflow walk run deploy-prod    # Execute walkthrough
```

---

## 📖 Documentation

- [Getting Started Guide](docs/getting-started.md)
- [Configuration Reference](docs/configuration.md)
- [Agent Integration Guide](docs/agents.md)
- [YAML Schema Reference](docs/schemas.md)
- [API Documentation](docs/api.md)

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with ❤️ for developers who want AI agents that actually work together</sub>
</p>
