package agent

import (
	"sync"
	"time"
)

// HealthStatus represents detailed agent health metrics
type HealthStatus struct {
	Status         Status       `json:"status"`           // idle/busy/rate_limited/failed
	Tokens         *TokenBudget `json:"tokens"`           // Token usage and budget
	RateLimit      *RateLimiter `json:"rate_limit"`       // Rate limit tracking
	LastActivity   time.Time    `json:"last_activity"`    // Last activity timestamp
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
		Status: StatusDisconnected,
		Tokens: &TokenBudget{
			TotalBudget: tokenBudget,
			ResetAt:     time.Now().Add(24 * time.Hour),
		},
		RateLimit:    NewRateLimiter(60), // Default 60 RPM
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
	h.Tokens.UsedTokens += tokensUsed
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
	if h.Tokens.TotalBudget > 0 && h.Tokens.UsedTokens >= h.Tokens.TotalBudget {
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
	
	// Create deep copy of tokens and limits
	tokens := *h.Tokens
	
	// Rate limit is more complex to copy purely, for snapshot we just copy RPM
	// In a real scenario we might copy timestamps but usually not needed for UI
	
	return HealthStatus{
		Status:         h.Status,
		Tokens:         &tokens,
		RateLimit:      h.RateLimit, // Pointer copy is acceptable for read-only snapshot in this context
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
	
	return h.Tokens.TotalBudget > 0 && h.Tokens.UsedTokens >= h.Tokens.TotalBudget
}

// TokenBudget tracks token usage against a limit
type TokenBudget struct {
	TotalBudget int       `json:"total_budget"` // Max tokens allowed
	UsedTokens  int       `json:"used_tokens"`  // Tokens used so far
	ResetAt     time.Time `json:"reset_at"`     // When the budget resets
}

// RateLimiter implements a sliding window rate limiter
type RateLimiter struct {
	RequestsPerMinute int       `json:"requests_per_minute"`
	RequestTimestamps []time.Time `json:"-"`
	mu                sync.Mutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(rpm int) *RateLimiter {
	return &RateLimiter{
		RequestsPerMinute: rpm,
		RequestTimestamps: make([]time.Time, 0),
	}
}

// Allow checks if a request is allowed
func (rl *RateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	// Remove timestamps older than 1 minute
	valid := make([]time.Time, 0)
	for _, t := range rl.RequestTimestamps {
		if now.Sub(t) < time.Minute {
			valid = append(valid, t)
		}
	}
	rl.RequestTimestamps = valid

	if len(rl.RequestTimestamps) < rl.RequestsPerMinute {
		rl.RequestTimestamps = append(rl.RequestTimestamps, now)
		return true
	}
	return false
}

// TimeUntilReset returns duration until next slot opens
func (rl *RateLimiter) TimeUntilReset() time.Duration {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	
	if len(rl.RequestTimestamps) == 0 {
		return 0
	}
	// Oldest timestamp + 1 minute is when a slot opens
	resetTime := rl.RequestTimestamps[0].Add(time.Minute)
	return time.Until(resetTime)
}

