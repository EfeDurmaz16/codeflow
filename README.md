# CodeFlow

**Multi-Agent Orchestration Dashboard** - A Flower-like monitoring system for AI coding agents.

Monitor and orchestrate AI coding agents including Cursor, Windsurf, Claude Code, Codex, Gemini CLI, and Aider from a single premium dashboard.

## Features

### Agent Registry
- Auto-discover and manual registration of agents
- Support for multiple agent types: Cursor, Windsurf, Claude Code, Codex, Gemini CLI, Aider, Custom
- Real-time health status: online/offline/busy/error with latency monitoring
- Capabilities matrix (languages, frameworks, tools)

### Task Management
- Create tasks with natural language descriptions
- Priority levels: critical, high, normal, low
- Multiple assignment methods: manual, round-robin, capability-based
- Task dependencies and subtask decomposition
- Kanban board and list views

### Real-Time Dashboard
- Grid/list view of all agents
- Per-agent metrics: CPU, memory, tokens used, cost
- Live log streaming
- Token usage and cost tracking

### Workflow Builder
- Visual DAG editor for multi-agent workflows
- Parallel and sequential execution support
- Conditional branching
- Built-in templates: full-stack dev, bug fix, code review, docs

### File Sync & Git Integration
- Shared workspace across agents
- File locking and conflict detection
- Branch per task with auto-commit
- Pull request creation

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js with tRPC
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSocket for live updates
- **State**: Zustand for client state management
- **Workflow Editor**: React Flow for DAG visualization

## Design System

- Premium, minimal aesthetic
- **No gradients** - clean, flat design
- Colors: Pure whites, deep blacks (#0A0A0A), electric blue accent (#0066FF)
- Typography: Geist font family
- Dark mode first

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/codeflow.git
   cd codeflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env .env.local
   ```

   Update `.env.local` with your database credentials:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/codeflow?schema=public"
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the dashboard**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Docker Development

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **Run database migrations**
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

3. **Access the dashboard**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
codeflow/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (dashboard)/        # Dashboard layout group
│   │   │   ├── page.tsx        # Main dashboard
│   │   │   ├── agents/         # Agent management
│   │   │   ├── tasks/          # Task management
│   │   │   ├── workflows/      # Workflow builder
│   │   │   └── settings/       # Settings page
│   │   └── api/                # API routes
│   │       └── trpc/           # tRPC handler
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Layout components
│   │   ├── dashboard/          # Dashboard components
│   │   ├── agents/             # Agent components
│   │   ├── tasks/              # Task components
│   │   └── workflows/          # Workflow components
│   ├── lib/                    # Utilities
│   │   ├── db/                 # Prisma client
│   │   ├── trpc.ts             # tRPC client
│   │   └── utils.ts            # Helper functions
│   ├── server/                 # Server-side code
│   │   ├── trpc/               # tRPC setup
│   │   └── routers/            # tRPC routers
│   ├── stores/                 # Zustand stores
│   └── types/                  # TypeScript types
├── prisma/
│   └── schema.prisma           # Database schema
├── public/                     # Static assets
├── docker-compose.yml          # Docker configuration
├── Dockerfile                  # Production container
└── package.json
```

## API Endpoints

### Agents
- `GET /api/trpc/agents.list` - List all agents
- `GET /api/trpc/agents.get` - Get agent by ID
- `POST /api/trpc/agents.create` - Create new agent
- `POST /api/trpc/agents.update` - Update agent
- `DELETE /api/trpc/agents.delete` - Delete agent
- `POST /api/trpc/agents.ping` - Ping agent health

### Tasks
- `GET /api/trpc/tasks.list` - List all tasks
- `GET /api/trpc/tasks.get` - Get task by ID
- `GET /api/trpc/tasks.byStatus` - Get tasks grouped by status
- `POST /api/trpc/tasks.create` - Create new task
- `POST /api/trpc/tasks.update` - Update task
- `POST /api/trpc/tasks.assign` - Assign task to agent
- `DELETE /api/trpc/tasks.delete` - Delete task

### Workflows
- `GET /api/trpc/workflows.list` - List all workflows
- `GET /api/trpc/workflows.get` - Get workflow by ID
- `GET /api/trpc/workflows.templates` - Get workflow templates
- `POST /api/trpc/workflows.create` - Create new workflow
- `POST /api/trpc/workflows.update` - Update workflow
- `POST /api/trpc/workflows.run` - Run workflow
- `POST /api/trpc/workflows.clone` - Clone workflow
- `DELETE /api/trpc/workflows.delete` - Delete workflow

### Settings
- `GET /api/trpc/settings.list` - List all settings
- `GET /api/trpc/settings.get` - Get setting by key
- `POST /api/trpc/settings.set` - Set setting value
- `DELETE /api/trpc/settings.delete` - Delete setting

## Data Models

### Agent
```typescript
interface Agent {
  id: string;
  name: string;
  type: 'cursor' | 'windsurf' | 'claude_code' | 'codex' | 'gemini' | 'aider' | 'custom';
  status: 'online' | 'offline' | 'busy' | 'error';
  endpoint: string;
  capabilities: string[];
  currentTask?: string;
  metrics: {
    cpu: number;
    memory: number;
    tokensUsed: number;
    cost: number;
  };
}
```

### Task
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'queued' | 'assigned' | 'running' | 'completed' | 'failed';
  priority: 'critical' | 'high' | 'normal' | 'low';
  assignedAgent?: string;
  subtasks: string[];
  dependencies: string[];
}
```

### Workflow
```typescript
interface Workflow {
  id: string;
  name: string;
  graph: WorkflowNode[];
  triggers: string[];
  status: 'active' | 'paused' | 'draft';
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `WS_PORT` | WebSocket server port | `3001` |
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:3001` |

### Settings (via UI)

- API Keys: OpenAI, Anthropic, Google AI, GitHub
- Agent defaults: assignment method, auto-retry, timeout
- Integrations: GitHub auto-commit, branch creation
- Notifications: task completed/failed, agent offline

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.
