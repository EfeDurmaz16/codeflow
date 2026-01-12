// Package event provides event logging and history for CodeFlow.
package event

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// EventType represents the type of event
type EventType string

const (
	// File events
	FileChanged  EventType = "file_changed"
	FileCreated  EventType = "file_created"
	FileDeleted  EventType = "file_deleted"

	// Task events
	TaskCreated   EventType = "task_created"
	TaskStarted   EventType = "task_started"
	TaskCompleted EventType = "task_completed"
	TaskFailed    EventType = "task_failed"
	TaskAssigned  EventType = "task_assigned"

	// Agent events
	AgentConnected    EventType = "agent_connected"
	AgentDisconnected EventType = "agent_disconnected"
	AgentError        EventType = "agent_error"

	// Sync events
	SyncStarted   EventType = "sync_started"
	SyncCompleted EventType = "sync_completed"
	ConflictDetected  EventType = "conflict_detected"
	ConflictResolved  EventType = "conflict_resolved"
)

// Event represents a single event in the system
type Event struct {
	ID        string                 `json:"id"`
	Type      EventType              `json:"type"`
	Timestamp time.Time              `json:"timestamp"`
	TaskID    string                 `json:"task_id,omitempty"`
	AgentID   string                 `json:"agent_id,omitempty"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

// Logger handles event logging and persistence
type Logger struct {
	logPath     string
	mu          sync.Mutex
	file        *os.File
	eventChan   chan Event
	subscribers []chan Event
	subMu       sync.RWMutex
}

// NewLogger creates a new event logger
func NewLogger(logPath string) *Logger {
	return &Logger{
		logPath:     logPath,
		eventChan:   make(chan Event, 1000),
		subscribers: make([]chan Event, 0),
	}
}

// Start begins the event logger
func (l *Logger) Start(ctx context.Context) error {
	// Ensure log directory exists
	if err := os.MkdirAll(l.logPath, 0755); err != nil {
		return fmt.Errorf("failed to create log directory: %w", err)
	}

	// Open today's log file
	logFile := filepath.Join(l.logPath, fmt.Sprintf("%s.event", time.Now().Format("2006-01-02")))
	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}
	l.file = file

	// Start processing goroutine
	go l.processEvents(ctx)

	return nil
}

// processEvents handles incoming events
func (l *Logger) processEvents(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case event := <-l.eventChan:
			l.writeEvent(event)
			l.notifySubscribers(event)
		}
	}
}

// writeEvent writes an event to the log file
func (l *Logger) writeEvent(e Event) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.file == nil {
		return
	}

	data, err := json.Marshal(e)
	if err != nil {
		return
	}

	l.file.Write(data)
	l.file.Write([]byte("\n"))
}

// notifySubscribers sends the event to all subscribers
func (l *Logger) notifySubscribers(e Event) {
	l.subMu.RLock()
	defer l.subMu.RUnlock()

	for _, ch := range l.subscribers {
		select {
		case ch <- e:
		default:
			// Drop if subscriber is slow
		}
	}
}

// Log logs a new event
func (l *Logger) Log(e Event) {
	if e.ID == "" {
		e.ID = generateID()
	}
	if e.Timestamp.IsZero() {
		e.Timestamp = time.Now()
	}

	select {
	case l.eventChan <- e:
	default:
		// Drop if channel is full
	}
}

// Subscribe returns a channel that receives all events
func (l *Logger) Subscribe() chan Event {
	ch := make(chan Event, 100)
	
	l.subMu.Lock()
	l.subscribers = append(l.subscribers, ch)
	l.subMu.Unlock()
	
	return ch
}

// Stop stops the event logger
func (l *Logger) Stop(ctx context.Context) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.file != nil {
		return l.file.Close()
	}
	return nil
}

// generateID generates a simple unique ID
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
