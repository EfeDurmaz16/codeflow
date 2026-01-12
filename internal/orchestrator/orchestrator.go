// Package orchestrator provides the core orchestration logic for CodeFlow.
package orchestrator

import (
	"context"
	"fmt"
	"path/filepath"
	"sync"

	"github.com/codeflow/orchestrator/internal/agent"
	"github.com/codeflow/orchestrator/internal/config"
	"github.com/codeflow/orchestrator/internal/event"
	"github.com/codeflow/orchestrator/internal/parser"
	"github.com/codeflow/orchestrator/internal/task"
	"github.com/codeflow/orchestrator/internal/watcher"
)

// Orchestrator is the main coordinator for CodeFlow
type Orchestrator struct {
	config       *config.Config
	parser       *parser.Parser
	eventLogger  *event.Logger
	fileWatcher  *watcher.Watcher
	taskManager  *task.Manager
	agentManager *agent.Manager

	// Execution state
	executionQueue chan *ExecutionRequest
	running        bool
	mu             sync.RWMutex
}

// ExecutionRequest represents a task execution request
type ExecutionRequest struct {
	TaskID    string
	AgentID   string
	Prompt    string
	System    string
	Callback  func(result string, err error)
}

// New creates a new Orchestrator
func New(cfg *config.Config) (*Orchestrator, error) {
	// Initialize parser
	schemaDir := filepath.Join(cfg.ProjectRoot, "schemas")
	p, err := parser.New(schemaDir)
	if err != nil {
		// Log but continue - schemas might not exist
		fmt.Printf("Warning: schema loading failed: %v\n", err)
		p, _ = parser.New("")
	}

	// Initialize event logger
	eventLogger := event.NewLogger(cfg.EventLogPath)

	// Initialize file watcher
	fileWatcher := watcher.New(cfg.WatchPaths, eventLogger)

	// Initialize task manager
	tasksDir := filepath.Join(cfg.ProjectRoot, ".tasks")
	taskManager := task.NewManager(tasksDir, p, eventLogger)

	// Initialize agent manager
	agentManager := agent.NewManager(eventLogger)

	return &Orchestrator{
		config:         cfg,
		parser:         p,
		eventLogger:    eventLogger,
		fileWatcher:    fileWatcher,
		taskManager:    taskManager,
		agentManager:   agentManager,
		executionQueue: make(chan *ExecutionRequest, 100),
	}, nil
}

// Start starts the orchestrator
func (o *Orchestrator) Start(ctx context.Context) error {
	o.mu.Lock()
	if o.running {
		o.mu.Unlock()
		return fmt.Errorf("orchestrator already running")
	}
	o.running = true
	o.mu.Unlock()

	// Start event logger
	if err := o.eventLogger.Start(ctx); err != nil {
		return fmt.Errorf("failed to start event logger: %w", err)
	}

	// Start file watcher
	if err := o.fileWatcher.Start(ctx); err != nil {
		return fmt.Errorf("failed to start file watcher: %w", err)
	}

	// Load existing tasks
	if err := o.taskManager.LoadTasks(); err != nil {
		// Log but continue
		fmt.Printf("Warning: failed to load tasks: %v\n", err)
	}

	// Start execution workers
	for i := 0; i < o.config.MaxConcurrentTasks; i++ {
		go o.executionWorker(ctx, i)
	}

	// Start event handler
	go o.handleEvents(ctx)

	o.eventLogger.Log(event.Event{
		Type: event.SyncStarted,
		Data: map[string]interface{}{
			"mode":               o.config.Mode,
			"max_concurrent":     o.config.MaxConcurrentTasks,
			"conflict_resolution": o.config.ConflictResolution,
		},
	})

	return nil
}

// Stop stops the orchestrator
func (o *Orchestrator) Stop(ctx context.Context) error {
	o.mu.Lock()
	o.running = false
	o.mu.Unlock()

	close(o.executionQueue)

	if err := o.fileWatcher.Stop(ctx); err != nil {
		fmt.Printf("Warning: file watcher stop error: %v\n", err)
	}

	if err := o.eventLogger.Stop(ctx); err != nil {
		fmt.Printf("Warning: event logger stop error: %v\n", err)
	}

	return nil
}

// executionWorker processes execution requests
func (o *Orchestrator) executionWorker(ctx context.Context, id int) {
	for {
		select {
		case <-ctx.Done():
			return
		case req, ok := <-o.executionQueue:
			if !ok {
				return
			}
			o.executeRequest(ctx, req)
		}
	}
}

// executeRequest executes a single request
func (o *Orchestrator) executeRequest(ctx context.Context, req *ExecutionRequest) {
	// Update task status
	if err := o.taskManager.UpdateTaskStatus(req.TaskID, task.StatusRunning); err != nil {
		fmt.Printf("Warning: failed to update task status: %v\n", err)
	}

	o.eventLogger.Log(event.Event{
		Type:    event.TaskStarted,
		TaskID:  req.TaskID,
		AgentID: req.AgentID,
	})

	// Execute with agent
	var result string
	var err error

	if req.System != "" {
		result, err = o.agentManager.ExecuteWithSystem(ctx, req.AgentID, req.System, req.Prompt)
	} else {
		result, err = o.agentManager.Execute(ctx, req.AgentID, req.Prompt)
	}

	if err != nil {
		o.taskManager.UpdateTaskStatus(req.TaskID, task.StatusFailed)
		o.eventLogger.Log(event.Event{
			Type:    event.TaskFailed,
			TaskID:  req.TaskID,
			AgentID: req.AgentID,
			Data: map[string]interface{}{
				"error": err.Error(),
			},
		})
	} else {
		o.taskManager.UpdateTaskStatus(req.TaskID, task.StatusCompleted)
		o.eventLogger.Log(event.Event{
			Type:    event.TaskCompleted,
			TaskID:  req.TaskID,
			AgentID: req.AgentID,
			Data: map[string]interface{}{
				"result_length": len(result),
			},
		})
	}

	if req.Callback != nil {
		req.Callback(result, err)
	}
}

// handleEvents processes incoming events
func (o *Orchestrator) handleEvents(ctx context.Context) {
	eventChan := o.eventLogger.Subscribe()

	for {
		select {
		case <-ctx.Done():
			return
		case evt := <-eventChan:
			o.processEvent(evt)
		}
	}
}

// processEvent handles a single event
func (o *Orchestrator) processEvent(evt event.Event) {
	switch evt.Type {
	case event.FileChanged:
		// Check if it's a task file
		if path, ok := evt.Data["path"].(string); ok {
			o.handleFileChange(path)
		}

	case event.TaskCreated:
		// Auto-assign if configured
		if o.config.Mode == "parallel" {
			o.autoAssignTask(evt.TaskID)
		}
	}
}

// handleFileChange processes a file change event
func (o *Orchestrator) handleFileChange(path string) {
	// Reload task if it's a task file
	if filepath.Dir(path) == filepath.Join(o.config.ProjectRoot, ".tasks", "active") {
		o.taskManager.LoadTasks()
	}
}

// autoAssignTask automatically assigns an agent to a task
func (o *Orchestrator) autoAssignTask(taskID string) {
	t, exists := o.taskManager.GetTask(taskID)
	if !exists {
		return
	}

	// Find best agent based on task type (heuristic from task name)
	taskType := "code_generation" // Default
	if agent := o.agentManager.FindAgentForTask(taskType); agent != nil {
		o.taskManager.AssignAgents(taskID, []string{agent.Config.ID})
	}

	// If task has assigned agents, queue for execution
	if len(t.Config.Metadata.AssignedAgents) > 0 {
		o.QueueExecution(taskID, t.Config.Metadata.AssignedAgents[0], t.Config.Description, "")
	}
}

// QueueExecution queues a task for execution
func (o *Orchestrator) QueueExecution(taskID, agentID, prompt, system string) {
	o.executionQueue <- &ExecutionRequest{
		TaskID:  taskID,
		AgentID: agentID,
		Prompt:  prompt,
		System:  system,
	}
}

// CreateTask creates a new task
func (o *Orchestrator) CreateTask(name, description, priority string) (*task.Task, error) {
	return o.taskManager.CreateTask(name, description, priority)
}

// ListTasks lists tasks with optional status filter
func (o *Orchestrator) ListTasks(status task.Status) []*task.Task {
	return o.taskManager.ListTasks(status)
}

// RegisterAgent registers an agent
func (o *Orchestrator) RegisterAgent(cfg parser.AgentConfig, apiKey string) error {
	return o.agentManager.RegisterAgent(cfg, apiKey)
}

// ListAgents lists all agents
func (o *Orchestrator) ListAgents() []*agent.Agent {
	return o.agentManager.ListAgents()
}

// GetStats returns orchestrator statistics
func (o *Orchestrator) GetStats() map[string]interface{} {
	tasks := o.taskManager.ListTasks("")
	activeTasks := 0
	completedTasks := 0
	for _, t := range tasks {
		switch t.Status {
		case task.StatusActive, task.StatusRunning:
			activeTasks++
		case task.StatusCompleted:
			completedTasks++
		}
	}

	agents := o.agentManager.ListAgents()
	connectedAgents := 0
	for _, a := range agents {
		if a.GetStatus() == agent.StatusConnected {
			connectedAgents++
		}
	}

	return map[string]interface{}{
		"active_tasks":     activeTasks,
		"completed_tasks":  completedTasks,
		"total_tasks":      len(tasks),
		"connected_agents": connectedAgents,
		"total_agents":     len(agents),
		"mode":             o.config.Mode,
	}
}

// SubscribeEvents returns a channel that receives events
func (o *Orchestrator) SubscribeEvents() chan event.Event {
	return o.eventLogger.Subscribe()
}
