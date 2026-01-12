// Package types provides shared types for CodeFlow.
package types

import "time"

// Project represents project metadata
type Project struct {
	Name        string
	RootDir     string
	CreatedAt   time.Time
	ModifiedAt  time.Time
	GitEnabled  bool
	Mode        string // parallel, sequential, hybrid
}

// TaskSummary provides a lightweight task overview
type TaskSummary struct {
	ID          string
	Name        string
	Status      string
	Priority    string
	Progress    int
	AssignedTo  []string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// AgentSummary provides a lightweight agent overview
type AgentSummary struct {
	ID           string
	Name         string
	Provider     string
	Model        string
	Status       string
	CurrentTask  string
	TasksCompleted int
	TokensUsed   int
}

// EventSummary provides a lightweight event overview
type EventSummary struct {
	ID        string
	Type      string
	Message   string
	Timestamp time.Time
	TaskID    string
	AgentID   string
}

// DashboardState holds the current dashboard state
type DashboardState struct {
	Project      *Project
	Tasks        []TaskSummary
	Agents       []AgentSummary
	RecentEvents []EventSummary
	
	ActiveTaskCount    int
	CompletedTaskCount int
	BlockedTaskCount   int
	ConnectedAgents    int
	TotalAgents        int
}

// Conflict represents a detected conflict
type Conflict struct {
	ID          string
	FilePath    string
	Agent1      string
	Agent2      string
	Type        string // merge, logical, dependency
	Status      string // pending, resolved, failed
	DetectedAt  time.Time
	ResolvedAt  *time.Time
	Resolution  string
}

// Subtask represents a task subtask
type Subtask struct {
	ID         string
	Name       string
	AssignedTo string
	Status     string
	Progress   int
	Files      []string
}

// CostTracker tracks token and cost usage
type CostTracker struct {
	EstimatedTokens  int
	ActualTokens     int
	EstimatedCostUSD float64
	ActualCostUSD    float64
}
