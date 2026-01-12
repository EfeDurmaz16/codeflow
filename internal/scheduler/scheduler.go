// Package scheduler provides task scheduling and coordination for CodeFlow.
package scheduler

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/codeflow/orchestrator/internal/config"
	"github.com/codeflow/orchestrator/internal/event"
)

// TaskStatus represents the status of a task
type TaskStatus string

const (
	StatusActive    TaskStatus = "active"
	StatusQueued    TaskStatus = "queued"
	StatusRunning   TaskStatus = "running"
	StatusCompleted TaskStatus = "completed"
	StatusBlocked   TaskStatus = "blocked"
	StatusFailed    TaskStatus = "failed"
)

// Task represents a task to be executed
type Task struct {
	ID          string
	Name        string
	Description string
	Status      TaskStatus
	Priority    int
	Agents      []string
	Subtasks    []Subtask
	CreatedAt   time.Time
	StartedAt   *time.Time
	CompletedAt *time.Time
}

// Subtask represents a subtask within a task
type Subtask struct {
	ID          string
	Name        string
	AssignedTo  string
	Status      TaskStatus
	Progress    int // 0-100
}

// Scheduler manages task scheduling and execution
type Scheduler struct {
	config      *config.Config
	logger      *event.Logger
	tasks       map[string]*Task
	taskQueue   chan *Task
	mu          sync.RWMutex
	workers     int
	workerWg    sync.WaitGroup
}

// New creates a new scheduler
func New(cfg *config.Config, logger *event.Logger) *Scheduler {
	return &Scheduler{
		config:    cfg,
		logger:    logger,
		tasks:     make(map[string]*Task),
		taskQueue: make(chan *Task, 100),
		workers:   cfg.MaxConcurrentTasks,
	}
}

// Start begins the scheduler
func (s *Scheduler) Start(ctx context.Context) error {
	// Start worker pool
	for i := 0; i < s.workers; i++ {
		s.workerWg.Add(1)
		go s.worker(ctx, i)
	}

	// Subscribe to events
	eventChan := s.logger.Subscribe()
	go s.handleEvents(ctx, eventChan)

	return nil
}

// worker processes tasks from the queue
func (s *Scheduler) worker(ctx context.Context, id int) {
	defer s.workerWg.Done()

	for {
		select {
		case <-ctx.Done():
			return
		case task, ok := <-s.taskQueue:
			if !ok {
				return
			}
			s.executeTask(ctx, task)
		}
	}
}

// executeTask executes a single task
func (s *Scheduler) executeTask(ctx context.Context, task *Task) {
	s.updateTaskStatus(task.ID, StatusRunning)
	
	s.logger.Log(event.Event{
		Type:   event.TaskStarted,
		TaskID: task.ID,
		Data: map[string]interface{}{
			"name":   task.Name,
			"agents": task.Agents,
		},
	})

	// TODO: Actual task execution logic
	// For now, just simulate work
	select {
	case <-ctx.Done():
		return
	case <-time.After(time.Second):
	}

	s.updateTaskStatus(task.ID, StatusCompleted)
	
	s.logger.Log(event.Event{
		Type:   event.TaskCompleted,
		TaskID: task.ID,
	})
}

// handleEvents processes system events
func (s *Scheduler) handleEvents(ctx context.Context, eventChan chan event.Event) {
	for {
		select {
		case <-ctx.Done():
			return
		case e := <-eventChan:
			s.processEvent(e)
		}
	}
}

// processEvent handles a single event
func (s *Scheduler) processEvent(e event.Event) {
	switch e.Type {
	case event.FileChanged:
		// A file changed - check if it's a task file
		if path, ok := e.Data["path"].(string); ok {
			s.handleFileChange(path)
		}
	case event.TaskCreated:
		// New task was created
		if taskID, ok := e.Data["task_id"].(string); ok {
			s.scheduleTask(taskID)
		}
	}
}

// handleFileChange processes a file change event
func (s *Scheduler) handleFileChange(path string) {
	// TODO: Parse YAML task files and update scheduler state
	fmt.Printf("File changed: %s\n", path)
}

// scheduleTask adds a task to the execution queue
func (s *Scheduler) scheduleTask(taskID string) {
	s.mu.RLock()
	task, exists := s.tasks[taskID]
	s.mu.RUnlock()

	if !exists {
		return
	}

	select {
	case s.taskQueue <- task:
	default:
		// Queue is full
	}
}

// AddTask adds a new task to the scheduler
func (s *Scheduler) AddTask(task *Task) {
	s.mu.Lock()
	s.tasks[task.ID] = task
	s.mu.Unlock()

	s.logger.Log(event.Event{
		Type:   event.TaskCreated,
		TaskID: task.ID,
		Data: map[string]interface{}{
			"name":        task.Name,
			"description": task.Description,
			"priority":    task.Priority,
		},
	})
}

// GetTask returns a task by ID
func (s *Scheduler) GetTask(id string) (*Task, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	task, ok := s.tasks[id]
	return task, ok
}

// ListTasks returns all tasks with optional status filter
func (s *Scheduler) ListTasks(status TaskStatus) []*Task {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*Task
	for _, task := range s.tasks {
		if status == "" || task.Status == status {
			result = append(result, task)
		}
	}
	return result
}

// updateTaskStatus updates a task's status
func (s *Scheduler) updateTaskStatus(taskID string, status TaskStatus) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if task, ok := s.tasks[taskID]; ok {
		task.Status = status
		now := time.Now()
		switch status {
		case StatusRunning:
			task.StartedAt = &now
		case StatusCompleted, StatusFailed:
			task.CompletedAt = &now
		}
	}
}

// Stop stops the scheduler
func (s *Scheduler) Stop(ctx context.Context) error {
	close(s.taskQueue)
	
	// Wait for workers with timeout
	done := make(chan struct{})
	go func() {
		s.workerWg.Wait()
		close(done)
	}()

	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}
