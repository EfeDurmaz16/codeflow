<div align="center">

# CodeFlow

### Multi-Agent Orchestration Dashboard

A Flower-like monitoring and orchestration system for AI coding agents.

Manage **Cursor**, **Windsurf**, **Claude Code**, **Codex**, **Gemini CLI**, and **Aider** from a single dashboard.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io/)

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Contributing](#contributing)

---

</div>

## Overview

CodeFlow is a centralized command center for managing multiple AI coding agents. Monitor health, assign tasks, build workflows, and track costs—all in real-time.

<br>

## Features

<table>
<tr>
<td width="50%">

### 🤖 Agent Registry
- Auto-discover and register agents
- Health monitoring with latency tracking
- Capability matrix for smart assignment
- Support for 7 agent types

</td>
<td width="50%">

### 📋 Task Management
- Kanban board interface
- Priority levels (critical → low)
- Dependencies & subtasks
- Multiple assignment strategies

</td>
</tr>
<tr>
<td width="50%">

### 🔄 Workflow Builder
- Visual DAG editor
- Parallel & sequential execution
- Conditional branching
- Pre-built templates

</td>
<td width="50%">

### 📊 Real-Time Dashboard
- Live agent status updates
- CPU, memory, token metrics
- Cost tracking per agent
- WebSocket-powered updates

</td>
</tr>
</table>

<br>

## Tech Stack

```
Frontend        Next.js 16 · React 19 · TypeScript · Tailwind CSS · shadcn/ui
State           Zustand
API             tRPC
Database        PostgreSQL · Prisma 7
Real-time       WebSocket
Workflow        React Flow
```

<br>

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or Docker)

### Installation

```bash
# Clone
git clone https://github.com/EfeDurmaz16/codeflow.git
cd codeflow

# Install
npm install

# Environment
cp .env.example .env
```

### Database Setup

```bash
# Option 1: Docker (recommended)
docker-compose up -d postgres

# Option 2: Local PostgreSQL
# Update DATABASE_URL in .env

# Generate Prisma client
npx prisma generate
npx prisma db push
```

### Run

```bash
npm run dev
```

Open **http://localhost:3000**

<br>

## Documentation

### Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (dashboard)/          # Dashboard pages
│   │   ├── agents/           # Agent management
│   │   ├── tasks/            # Task Kanban
│   │   ├── workflows/        # Workflow builder
│   │   └── settings/         # Configuration
│   └── api/trpc/             # tRPC endpoint
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── dashboard/            # Dashboard widgets
│   ├── agents/               # Agent components
│   ├── tasks/                # Task components
│   └── workflows/            # Workflow editor
├── lib/
│   ├── db/                   # Prisma client
│   └── websocket/            # WS client
├── server/routers/           # tRPC routers
├── stores/                   # Zustand stores
└── types/                    # TypeScript types
```

### Pages

| Route | Description |
|:------|:------------|
| `/` | Dashboard with agent grid and stats |
| `/agents` | Agent list with search & filters |
| `/agents/[id]` | Agent detail with logs |
| `/tasks` | Task Kanban board |
| `/tasks/[id]` | Task detail view |
| `/workflows` | Workflow list |
| `/workflows/[id]/edit` | Visual DAG editor |
| `/settings` | API keys & configuration |

### API Reference

<details>
<summary><b>Agents</b></summary>

```
GET     /api/trpc/agents.list       List all agents
GET     /api/trpc/agents.get        Get agent by ID
POST    /api/trpc/agents.create     Create agent
POST    /api/trpc/agents.update     Update agent
DELETE  /api/trpc/agents.delete     Delete agent
POST    /api/trpc/agents.ping       Health check
```
</details>

<details>
<summary><b>Tasks</b></summary>

```
GET     /api/trpc/tasks.list        List all tasks
GET     /api/trpc/tasks.get         Get task by ID
GET     /api/trpc/tasks.byStatus    Tasks by status
POST    /api/trpc/tasks.create      Create task
POST    /api/trpc/tasks.update      Update task
POST    /api/trpc/tasks.assign      Assign to agent
DELETE  /api/trpc/tasks.delete      Delete task
```
</details>

<details>
<summary><b>Workflows</b></summary>

```
GET     /api/trpc/workflows.list    List workflows
GET     /api/trpc/workflows.get     Get workflow
POST    /api/trpc/workflows.create  Create workflow
POST    /api/trpc/workflows.update  Update workflow
POST    /api/trpc/workflows.run     Execute workflow
POST    /api/trpc/workflows.clone   Clone workflow
DELETE  /api/trpc/workflows.delete  Delete workflow
```
</details>

### Data Models

```typescript
interface Agent {
  id: string
  name: string
  type: 'cursor' | 'windsurf' | 'claude_code' | 'codex' | 'gemini' | 'aider' | 'custom'
  status: 'online' | 'offline' | 'busy' | 'error'
  endpoint: string
  capabilities: string[]
  metrics: { cpu: number; memory: number; tokensUsed: number; cost: number }
}

interface Task {
  id: string
  title: string
  description: string
  status: 'queued' | 'assigned' | 'running' | 'completed' | 'failed'
  priority: 'critical' | 'high' | 'normal' | 'low'
  assignedAgentId?: string
  dependencies: string[]
}

interface Workflow {
  id: string
  name: string
  status: 'active' | 'paused' | 'draft'
  graph: WorkflowNode[]
  triggers: string[]
}
```

<br>

## Design System

| Element | Value |
|:--------|:------|
| Background | `#0A0A0A` |
| Card | `#141414` |
| Border | `#262626` |
| Accent | `#0066FF` |
| Font | Geist Sans |

**Principles:** Dark mode first · No gradients · Minimal · High contrast

<br>

## Docker

```bash
# Development
docker-compose up -d

# Production build
docker build -t codeflow .
docker run -p 3000:3000 --env-file .env codeflow
```

<br>

## Environment Variables

| Variable | Description |
|:---------|:------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | Application URL |

<br>

## Contributing

```bash
# Fork & clone
git checkout -b feature/amazing-feature
git commit -m 'Add amazing feature'
git push origin feature/amazing-feature
# Open PR
```

<br>

## License

MIT © [Efe Durmaz](https://github.com/EfeDurmaz16)

---

<div align="center">

**[⬆ Back to top](#codeflow)**

</div>
