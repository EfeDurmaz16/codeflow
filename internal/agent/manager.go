// Package agent provides agent management for CodeFlow.
package agent

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/codeflow/orchestrator/internal/agent/claude"
	"github.com/codeflow/orchestrator/internal/event"
	"github.com/codeflow/orchestrator/internal/parser"
)

// Status represents agent connection status
type Status string

const (
	StatusConnected    Status = "connected"
	StatusDisconnected Status = "disconnected"
	StatusBusy         Status = "busy"
	StatusError        Status = "error"
)

// ErrAgentAlreadyRegistered is returned when trying to register an existing agent
var ErrAgentAlreadyRegistered = fmt.Errorf("agent already registered")

// Agent represents a managed AI agent
type Agent struct {
	Config        parser.AgentConfig
	Status        Status
	LastHeartbeat time.Time
	CurrentTask   string
	mu            sync.RWMutex

	// Health tracking
	Health *HealthStatus

	// Internal clients
	claudeClient *claude.Client
}

// Manager manages multiple agents
type Manager struct {
	agents map[string]*Agent
	logger *event.Logger
	mu     sync.RWMutex
}

// GetTotalTokensUsed returns the total tokens used by all agents
func (m *Manager) GetTotalTokensUsed() int {
	m.mu.RLock()
	defer m.mu.RUnlock()

	total := 0
	for _, agent := range m.agents {
		if agent.Health != nil && agent.Health.Tokens != nil {
			total += agent.Health.Tokens.UsedTokens
		}
	}
	return total
}

// NewManager creates a new agent manager
func NewManager(logger *event.Logger) *Manager {
	return &Manager{
		agents: make(map[string]*Agent),
		logger: logger,
	}
}

// RegisterAgent registers a new agent from config
func (m *Manager) RegisterAgent(config parser.AgentConfig, apiKey string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.agents[config.ID]; exists {
		return fmt.Errorf("%w: %s", ErrAgentAlreadyRegistered, config.ID)
	}

	agent := &Agent{
		Config:        config,
		Status:        StatusDisconnected,
		LastHeartbeat: time.Now(),
		Health:        NewHealthStatus(config.Constraints.MaxTokens),
	}

	// Initialize provider-specific clients
	switch config.Provider {
	case "anthropic":
		opts := []claude.ClientOption{}
		if config.Model != "" {
			opts = append(opts, claude.WithModel(config.Model))
		}
		if config.Constraints.MaxTokens > 0 {
			opts = append(opts, claude.WithMaxTokens(config.Constraints.MaxTokens))
		}
		agent.claudeClient = claude.NewClient(apiKey, opts...)
		agent.Status = StatusConnected
	case "ide_agent":
		// IDE agents are external and always considered connected upon registration
		agent.Status = StatusConnected
	default:
		// Other providers will be added later
		agent.Status = StatusDisconnected
	}

	m.agents[config.ID] = agent

	m.logger.Log(event.Event{
		Type:    event.AgentConnected,
		AgentID: config.ID,
		Data: map[string]interface{}{
			"provider": config.Provider,
			"model":    config.Model,
		},
	})

	return nil
}

// UnregisterAgent removes an agent
func (m *Manager) UnregisterAgent(agentID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.agents[agentID]; !exists {
		return fmt.Errorf("agent %s not found", agentID)
	}

	delete(m.agents, agentID)

	m.logger.Log(event.Event{
		Type:    event.AgentDisconnected,
		AgentID: agentID,
	})

	return nil
}

// GetAgent returns an agent by ID
func (m *Manager) GetAgent(agentID string) (*Agent, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	agent, exists := m.agents[agentID]
	return agent, exists
}

// ListAgents returns all registered agents
func (m *Manager) ListAgents() []*Agent {
	m.mu.RLock()
	defer m.mu.RUnlock()

	agents := make([]*Agent, 0, len(m.agents))
	for _, agent := range m.agents {
		agents = append(agents, agent)
	}
	return agents
}

// GetConnectedAgents returns agents that are connected
func (m *Manager) GetConnectedAgents() []*Agent {
	m.mu.RLock()
	defer m.mu.RUnlock()

	agents := make([]*Agent, 0)
	for _, agent := range m.agents {
		if agent.Status == StatusConnected {
			agents = append(agents, agent)
		}
	}
	return agents
}

// FindAgentForTask finds the best agent for a task based on specializations
func (m *Manager) FindAgentForTask(taskType string) *Agent {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var bestAgent *Agent
	bestScore := 0

	for _, agent := range m.agents {
		if agent.Status != StatusConnected {
			continue
		}

		score := 0
		for _, spec := range agent.Config.TaskAssignment.Specializations {
			if spec == taskType {
				score += 10
			}
		}

		// Consider skill level
		switch agent.Config.TaskAssignment.SkillLevel {
		case "expert":
			score += 5
		case "senior":
			score += 3
		case "junior":
			score += 1
		}

		if score > bestScore {
			bestScore = score
			bestAgent = agent
		}
	}

	return bestAgent
}

// Execute executes a task with the specified agent
func (m *Manager) Execute(ctx context.Context, agentID string, prompt string) (string, error) {
	agent, exists := m.GetAgent(agentID)
	if !exists {
		return "", fmt.Errorf("agent %s not found", agentID)
	}

	agent.mu.Lock()
	if agent.Status != StatusConnected {
		agent.mu.Unlock()
		return "", fmt.Errorf("agent %s is not connected", agentID)
	}
	
	// Check Limits
	if agent.Health.IsBudgetExceeded() {
		agent.mu.Unlock()
		return "", fmt.Errorf("agent %s token budget exceeded", agentID)
	}
	if !agent.Health.RateLimit.Allow() {
		agent.mu.Unlock()
		return "", fmt.Errorf("agent %s rate limit exceeded (wait %s)", agentID, agent.Health.RateLimit.TimeUntilReset())
	}

	agent.Status = StatusBusy
	// Record activity
	agent.Health.SetCurrentTask("executing")
	agent.mu.Unlock()

	defer func() {
		agent.mu.Lock()
		agent.Status = StatusConnected
		agent.Health.ClearCurrentTask()
		agent.mu.Unlock()
	}()

	// Execute based on provider
	switch agent.Config.Provider {
	case "anthropic":
		if agent.claudeClient == nil {
			return "", fmt.Errorf("claude client not initialized")
		}
		start := time.Now()
		resp, err := agent.claudeClient.Chat(ctx, prompt)
		latency := time.Since(start).Milliseconds()
		
		// Approximate tokens (1 char ~ 0.25 tokens for simple estimation)
		tokens := len(prompt) / 4
		if err == nil {
			tokens += len(resp) / 4
		}
		
		agent.Health.RecordRequest(tokens, latency, err == nil)
		return resp, err
	case "ide_agent":
		// For IDE agents, we simulate execution or wait for external callback
		// For this demo, we'll simulate a delay and success
		select {
		case <-time.After(3 * time.Second):
			// Record mock health data
			agent.Health.RecordRequest(100, 3000, true)
			return fmt.Sprintf("Executed task in %s: %s", agent.Config.Model, "Success"), nil
		case <-ctx.Done():
			agent.Health.RecordRequest(0, 0, false)
			return "", ctx.Err()
		}
	default:
		return "", fmt.Errorf("unsupported provider: %s", agent.Config.Provider)
	}
}

// ExecuteWithSystem executes with a system prompt
func (m *Manager) ExecuteWithSystem(ctx context.Context, agentID, system, prompt string) (string, error) {
	agent, exists := m.GetAgent(agentID)
	if !exists {
		return "", fmt.Errorf("agent %s not found", agentID)
	}

	agent.mu.Lock()
	if agent.Status != StatusConnected {
		agent.mu.Unlock()
		return "", fmt.Errorf("agent %s is not connected", agentID)
	}
	agent.Status = StatusBusy
	agent.mu.Unlock()

	defer func() {
		agent.mu.Lock()
		agent.Status = StatusConnected
		agent.mu.Unlock()
	}()

	switch agent.Config.Provider {
	case "anthropic":
		if agent.claudeClient == nil {
			return "", fmt.Errorf("claude client not initialized")
		}
		return agent.claudeClient.ChatWithSystem(ctx, system, prompt)
	case "ide_agent":
		// Mock execution for demo
		select {
		case <-time.After(3 * time.Second):
			return fmt.Sprintf("Executed task (system) in %s: %s", agent.Config.Model, "Success"), nil
		case <-ctx.Done():
			return "", ctx.Err()
		}
	default:
		return "", fmt.Errorf("unsupported provider: %s", agent.Config.Provider)
	}
}

// GetStatus returns the current status of an agent
func (a *Agent) GetStatus() Status {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.Status
}

// SetCurrentTask sets the current task for an agent
func (a *Agent) SetCurrentTask(taskID string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.CurrentTask = taskID
}

// GetCurrentTask returns the current task
func (a *Agent) GetCurrentTask() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.CurrentTask
}
