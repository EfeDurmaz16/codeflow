// Package watcher provides file system watching capabilities for CodeFlow.
package watcher

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/codeflow/orchestrator/internal/event"
)

// Watcher watches file system changes and emits events
type Watcher struct {
	paths       []string
	logger      *event.Logger
	watcher     *fsnotify.Watcher
	mu          sync.RWMutex
	debounce    time.Duration
	pending     map[string]time.Time
	pendingMu   sync.Mutex
}

// New creates a new file watcher
func New(paths []string, logger *event.Logger) *Watcher {
	return &Watcher{
		paths:    paths,
		logger:   logger,
		debounce: 500 * time.Millisecond,
		pending:  make(map[string]time.Time),
	}
}

// Start begins watching the configured paths
func (w *Watcher) Start(ctx context.Context) error {
	var err error
	w.watcher, err = fsnotify.NewWatcher()
	if err != nil {
		return fmt.Errorf("failed to create watcher: %w", err)
	}

	// Add all configured paths
	for _, path := range w.paths {
		absPath, err := filepath.Abs(path)
		if err != nil {
			continue
		}
		
		if err := w.addRecursive(absPath); err != nil {
			// Log but don't fail - path might not exist yet
			fmt.Printf("  ⚠️  Could not watch %s: %v\n", path, err)
		}
	}

	// Start event processing goroutine
	go w.processEvents(ctx)

	// Start debounce processor
	go w.processDebounced(ctx)

	return nil
}

// addRecursive adds a path and all subdirectories to the watcher
func (w *Watcher) addRecursive(path string) error {
	return filepath.Walk(path, func(walkPath string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors, continue walking
		}
		
		// Only add directories
		if info != nil && info.IsDir() {
			if err := w.watcher.Add(walkPath); err != nil {
				return nil // Skip errors
			}
		}
		
		return nil
	})
}

// processEvents handles fsnotify events
func (w *Watcher) processEvents(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-w.watcher.Events:
			if !ok {
				return
			}
			w.handleEvent(event)
		case err, ok := <-w.watcher.Errors:
			if !ok {
				return
			}
			fmt.Printf("Watcher error: %v\n", err)
		}
	}
}

// handleEvent processes a single file system event
func (w *Watcher) handleEvent(fsEvent fsnotify.Event) {
	// Debounce: record the event time
	w.pendingMu.Lock()
	w.pending[fsEvent.Name] = time.Now()
	w.pendingMu.Unlock()
}

// processDebounced checks for debounced events and emits them
func (w *Watcher) processDebounced(ctx context.Context) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.emitDebouncedEvents()
		}
	}
}

// emitDebouncedEvents emits events that have been stable long enough
func (w *Watcher) emitDebouncedEvents() {
	now := time.Now()
	var toEmit []string

	w.pendingMu.Lock()
	for path, lastTime := range w.pending {
		if now.Sub(lastTime) >= w.debounce {
			toEmit = append(toEmit, path)
			delete(w.pending, path)
		}
	}
	w.pendingMu.Unlock()

	// Emit events
	for _, path := range toEmit {
		w.logger.Log(event.Event{
			Type:      event.FileChanged,
			Timestamp: time.Now(),
			Data: map[string]interface{}{
				"path": path,
			},
		})
	}
}

// Stop stops the file watcher
func (w *Watcher) Stop(ctx context.Context) error {
	if w.watcher != nil {
		return w.watcher.Close()
	}
	return nil
}
