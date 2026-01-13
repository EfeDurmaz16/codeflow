package timeline

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"gopkg.in/yaml.v3"
)

// Entry represents a single timeline event
type Entry struct {
	ID        string                 `yaml:"id" json:"id"`
	Timestamp time.Time              `yaml:"timestamp" json:"timestamp"`
	Type      string                 `yaml:"type" json:"type"` // task_completed, milestone, etc.
	Title     string                 `yaml:"title" json:"title"`
	AgentID   string                 `yaml:"agent_id,omitempty" json:"agent_id,omitempty"`
	Summary   string                 `yaml:"summary,omitempty" json:"summary,omitempty"`
	Metrics   map[string]interface{} `yaml:"metrics,omitempty" json:"metrics,omitempty"`
}

// Manager handles timeline reading and writing
type Manager struct {
	path string
	mu   sync.RWMutex
}

// NewManager creates a new timeline manager
func NewManager(projectRoot string) *Manager {
	return &Manager{
		path: filepath.Join(projectRoot, ".codeflow", "timeline.yaml"),
	}
}

// AddEntry adds a new entry to the timeline
func (m *Manager) AddEntry(entry Entry) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Ensure ID and Timestamp
	if entry.ID == "" {
		entry.ID = fmt.Sprintf("%d", time.Now().UnixNano())
	}
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now()
	}

	// Read existing
	entries, _ := m.readEntriesUnsafe()

	// Append (prepend? timeline usually newest first or last? Let's do append (chronological))
	entries = append(entries, entry)

	// Write back
	return m.writeEntriesUnsafe(entries)
}

// GetEntries returns all timeline entries
func (m *Manager) GetEntries() ([]Entry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.readEntriesUnsafe()
}

func (m *Manager) readEntriesUnsafe() ([]Entry, error) {
	data, err := os.ReadFile(m.path)
	if os.IsNotExist(err) {
		return []Entry{}, nil
	}
	if err != nil {
		return nil, err
	}

	var entries []Entry
	if err := yaml.Unmarshal(data, &entries); err != nil {
		return nil, err
	}
	return entries, nil
}

func (m *Manager) writeEntriesUnsafe(entries []Entry) error {
	// Ensure dir exists
	dir := filepath.Dir(m.path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	data, err := yaml.Marshal(entries)
	if err != nil {
		return err
	}

	return os.WriteFile(m.path, data, 0644)
}
