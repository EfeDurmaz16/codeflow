package agent

import (
	"sync"
	"time"
)

// HealthStatus represents detailed agent health metrics
type HealthStatus struct {
	Status         Status    `json:"status"`           // idle/busy/rate_limited/failed
	TokensUsed     int       `json:"tokens_used"`      // Total tokens consumed
	TokenBudget    int       `json:"token_budget"`     // Budget limit (0 = unlimited)
	LastActivity   time.Time `json:"last_activity"`    // Last activity timestamp
	CurrentTask    string    `json:"current_task"`     // Current task ID
	ErrorCount     int       `json:"error_count"`      // Number of errors encountered
	RequestCount   int       `json:"request_count"`    // Total requests processed
	SuccessRate    float64   `json:"success_rate"`     // Success rate percentage
	AverageLatency int64     `json:"average_latency"`  // Average response time (ms)
	mu             sync.RWMutex
}

// NewHealthStatus creates a new health status tracker
func NewHealthStatus(tokenBudget int) *HealthStatus {
	return &HealthStatus{
		Status:       StatusDisconnected,
		TokenBudget:  tokenBudget,
		LastActivity: time.Now(),
		SuccessRate:  100.0,
	}
}

// UpdateStatus updates the agent status
func (h *HealthStatus) UpdateStatus(status Status) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.Status = status
	h.LastActivity = time.Now()
}

// RecordRequest records a new request execution
func (h *HealthStatus) RecordRequest(tokensUsed int, latencyMs int64, success bool) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.RequestCount++
	h.TokensUsed += tokensUsed
	h.LastActivity = time.Now()

	// Update average latency (rolling average)
	if h.RequestCount == 1 {
		h.AverageLatency = latencyMs
	} else {
		h.AverageLatency = (h.AverageLatency*(int64(h.RequestCount-1)) + latencyMs) / int64(h.RequestCount)
	}

	// Update success rate
	if !success {
		h.ErrorCount++
	}
	h.SuccessRate = float64(h.RequestCount-h.ErrorCount) / float64(h.RequestCount) * 100.0

	// Check token budget
	if h.TokenBudget > 0 && h.TokensUsed >= h.TokenBudget {
		h.Status = StatusError // Use error status to indicate budget exceeded
	}
}

// SetCurrentTask sets the current task being processed
func (h *HealthStatus) SetCurrentTask(taskID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.CurrentTask = taskID
	h.LastActivity = time.Now()
}

// ClearCurrentTask clears the current task
func (h *HealthStatus) ClearCurrentTask() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.CurrentTask = ""
}

// GetSnapshot returns a copy of the current health status
func (h *HealthStatus) GetSnapshot() HealthStatus {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	return HealthStatus{
		Status:         h.Status,
		TokensUsed:     h.TokensUsed,
		TokenBudget:    h.TokenBudget,
		LastActivity:   h.LastActivity,
		CurrentTask:    h.CurrentTask,
		ErrorCount:     h.ErrorCount,
		RequestCount:   h.RequestCount,
		SuccessRate:    h.SuccessRate,
		AverageLatency: h.AverageLatency,
	}
}

// IsHealthy returns true if the agent is in a healthy state
func (h *HealthStatus) IsHealthy() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	return h.Status == StatusConnected || h.Status == StatusBusy
}

// IsBudgetExceeded returns true if token budget is exceeded
func (h *HealthStatus) IsBudgetExceeded() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	return h.TokenBudget > 0 && h.TokensUsed >= h.TokenBudget
}
