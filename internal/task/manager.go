// Package task provides task management for CodeFlow.
package task

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/codeflow/orchestrator/internal/event"
	"github.com/codeflow/orchestrator/internal/parser"
)

// Status represents task status
type Status string

const (
	StatusActive    Status = "active"
	StatusQueued    Status = "queued"
	StatusRunning   Status = "running"
	StatusCompleted Status = "completed"
	StatusBlocked   Status = "blocked"
	StatusFailed    Status = "failed"
	StatusPaused    Status = "paused"
	StatusReview    Status = "review"
)

// Task represents a managed task
type Task struct {
	Config    parser.TaskConfig
	Status    Status
	StartedAt *time.Time
	EndedAt   *time.Time
	FilePath  string
}

// Manager manages tasks
type Manager struct {
	tasksDir string
	parser   *parser.Parser
	logger   *event.Logger
	tasks    map[string]*Task
	mu       sync.RWMutex
}

// NewManager creates a new task manager
func NewManager(tasksDir string, p *parser.Parser, logger *event.Logger) *Manager {
	return &Manager{
		tasksDir: tasksDir,
		parser:   p,
		logger:   logger,
		tasks:    make(map[string]*Task),
	}
}

// LoadTasks loads all task files from the tasks directory
func (m *Manager) LoadTasks() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	dirs := []string{"active", "completed", "blocked"}

	for _, dir := range dirs {
		dirPath := filepath.Join(m.tasksDir, dir)
		if _, err := os.Stat(dirPath); os.IsNotExist(err) {
			continue
		}

		entries, err := os.ReadDir(dirPath)
		if err != nil {
			return fmt.Errorf("failed to read %s: %w", dir, err)
		}

		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".yaml") {
				continue
			}

			filePath := filepath.Join(dirPath, entry.Name())
			if err := m.loadTaskFile(filePath); err != nil {
				// Log error but continue loading other tasks
				fmt.Printf("Warning: failed to load %s: %v\n", filePath, err)
			}
		}
	}

	return nil
}

// loadTaskFile loads a single task file
func (m *Manager) loadTaskFile(filePath string) error {
	config, err := m.parser.LoadTask(filePath)
	if err != nil {
		return err
	}

	status := Status(config.Metadata.Status)
	if status == "" {
		status = StatusActive
	}

	task := &Task{
		Config:   *config,
		Status:   status,
		FilePath: filePath,
	}

	m.tasks[config.ID] = task
	return nil
}

// GetTask returns a task by ID
func (m *Manager) GetTask(id string) (*Task, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	task, exists := m.tasks[id]
	return task, exists
}

// ListTasks returns all tasks, optionally filtered by status
func (m *Manager) ListTasks(status Status) []*Task {
	m.mu.RLock()
	defer m.mu.RUnlock()

	tasks := make([]*Task, 0)
	for _, task := range m.tasks {
		if status == "" || task.Status == status {
			tasks = append(tasks, task)
		}
	}
	return tasks
}

// CreateTask creates a new task
func (m *Manager) CreateTask(name, description, priority string) (*Task, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Generate task ID
	id := m.generateTaskID()

	// Create config
	config := parser.TaskConfig{
		ID:          id,
		Name:        name,
		Description: description,
	}
	config.Metadata.CreatedAt = time.Now()
	config.Metadata.Priority = priority
	config.Metadata.Status = "active"

	// Determine file path
	fileName := fmt.Sprintf("%s-%s.yaml", id, slugify(name))
	filePath := filepath.Join(m.tasksDir, "active", fileName)

	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
		return nil, fmt.Errorf("failed to create directory: %w", err)
	}

	// Write to file
	if err := parser.WriteYAML(filePath, config); err != nil {
		return nil, fmt.Errorf("failed to write task file: %w", err)
	}

	task := &Task{
		Config:   config,
		Status:   StatusActive,
		FilePath: filePath,
	}

	m.tasks[id] = task

	m.logger.Log(event.Event{
		Type:   event.TaskCreated,
		TaskID: id,
		Data: map[string]interface{}{
			"name":        name,
			"description": description,
			"priority":    priority,
		},
	})

	return task, nil
}

// UpdateTaskStatus updates a task's status and optional summary
func (m *Manager) UpdateTaskStatus(id string, status Status, summary string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	task, exists := m.tasks[id]
	if !exists {
		return fmt.Errorf("task %s not found", id)
	}

	oldStatus := task.Status
	task.Status = status
	task.Config.Metadata.Status = string(status)
	if summary != "" {
		task.Config.Metadata.CompletionSummary = summary
	}

	now := time.Now()
	switch status {
	case StatusRunning:
		task.StartedAt = &now
	case StatusCompleted, StatusFailed:
		task.EndedAt = &now
	}

	// Move file to appropriate directory
	newDir := "active"
	switch status {
	case StatusCompleted:
		newDir = "completed"
	case StatusBlocked:
		newDir = "blocked"
	}

	oldDir := filepath.Dir(task.FilePath)
	newDirPath := filepath.Join(m.tasksDir, newDir)

	if filepath.Base(oldDir) != newDir {
		newPath := filepath.Join(newDirPath, filepath.Base(task.FilePath))
		
		if err := os.MkdirAll(newDirPath, 0755); err != nil {
			return fmt.Errorf("failed to create directory: %w", err)
		}

		if err := os.Rename(task.FilePath, newPath); err != nil {
			return fmt.Errorf("failed to move task file: %w", err)
		}
		task.FilePath = newPath
	}

	// Update file content
	if err := parser.WriteYAML(task.FilePath, task.Config); err != nil {
		return fmt.Errorf("failed to update task file: %w", err)
	}

	m.logger.Log(event.Event{
		Type:   event.TaskCompleted,
		TaskID: id,
		Data: map[string]interface{}{
			"old_status": oldStatus,
			"new_status": status,
			"summary":    summary,
		},
	})

	return nil
}

// AssignAgents assigns agents to a task
func (m *Manager) AssignAgents(taskID string, agentIDs []string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	task, exists := m.tasks[taskID]
	if !exists {
		return fmt.Errorf("task %s not found", taskID)
	}

	task.Config.Metadata.AssignedAgents = agentIDs

	if err := parser.WriteYAML(task.FilePath, task.Config); err != nil {
		return fmt.Errorf("failed to update task file: %w", err)
	}

	m.logger.Log(event.Event{
		Type:   event.TaskAssigned,
		TaskID: taskID,
		Data: map[string]interface{}{
			"agents": agentIDs,
		},
	})

	return nil
}

// generateTaskID generates a unique task ID
func (m *Manager) generateTaskID() string {
	// Find the highest existing task number
	maxNum := 0
	for id := range m.tasks {
		if strings.HasPrefix(id, "task-") {
			var num int
			if _, err := fmt.Sscanf(id, "task-%d", &num); err == nil {
				if num > maxNum {
					maxNum = num
				}
			}
		}
	}

	return fmt.Sprintf("task-%03d", maxNum+1)
}

// slugify converts a string to a URL-friendly slug
func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	// Remove special characters
	result := ""
	for _, c := range s {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' {
			result += string(c)
		}
	}
	// Remove consecutive dashes
	for strings.Contains(result, "--") {
		result = strings.ReplaceAll(result, "--", "-")
	}
	return strings.Trim(result, "-")
}
