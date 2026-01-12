// Package claude provides integration with the Claude API for CodeFlow.
package claude

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	defaultBaseURL = "https://api.anthropic.com/v1"
	defaultModel   = "claude-3-5-sonnet-20241022"
	defaultMaxTokens = 8192
)

// Client is a Claude API client
type Client struct {
	apiKey     string
	baseURL    string
	model      string
	maxTokens  int
	httpClient *http.Client
}

// ClientOption is a function that configures a Client
type ClientOption func(*Client)

// WithBaseURL sets a custom API base URL
func WithBaseURL(url string) ClientOption {
	return func(c *Client) {
		c.baseURL = url
	}
}

// WithModel sets the model to use
func WithModel(model string) ClientOption {
	return func(c *Client) {
		c.model = model
	}
}

// WithMaxTokens sets the max tokens for responses
func WithMaxTokens(maxTokens int) ClientOption {
	return func(c *Client) {
		c.maxTokens = maxTokens
	}
}

// WithHTTPClient sets a custom HTTP client
func WithHTTPClient(httpClient *http.Client) ClientOption {
	return func(c *Client) {
		c.httpClient = httpClient
	}
}

// NewClient creates a new Claude API client
func NewClient(apiKey string, opts ...ClientOption) *Client {
	c := &Client{
		apiKey:    apiKey,
		baseURL:   defaultBaseURL,
		model:     defaultModel,
		maxTokens: defaultMaxTokens,
		httpClient: &http.Client{
			Timeout: 120 * time.Second,
		},
	}

	for _, opt := range opts {
		opt(c)
	}

	return c
}

// Message represents a message in the conversation
type Message struct {
	Role    string `json:"role"` // "user" or "assistant"
	Content string `json:"content"`
}

// MessageRequest is the request body for creating a message
type MessageRequest struct {
	Model       string    `json:"model"`
	MaxTokens   int       `json:"max_tokens"`
	Messages    []Message `json:"messages"`
	System      string    `json:"system,omitempty"`
	Temperature float64   `json:"temperature,omitempty"`
	TopP        float64   `json:"top_p,omitempty"`
	TopK        int       `json:"top_k,omitempty"`
}

// ContentBlock represents a content block in the response
type ContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

// Usage represents token usage in the response
type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

// MessageResponse is the response from creating a message
type MessageResponse struct {
	ID           string         `json:"id"`
	Type         string         `json:"type"`
	Role         string         `json:"role"`
	Content      []ContentBlock `json:"content"`
	Model        string         `json:"model"`
	StopReason   string         `json:"stop_reason"`
	StopSequence *string        `json:"stop_sequence"`
	Usage        Usage          `json:"usage"`
}

// GetText returns the text content from the response
func (r *MessageResponse) GetText() string {
	for _, block := range r.Content {
		if block.Type == "text" {
			return block.Text
		}
	}
	return ""
}

// APIError represents an API error response
type APIError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

func (e *APIError) Error() string {
	return fmt.Sprintf("claude api error: %s - %s", e.Type, e.Message)
}

// CreateMessage sends a message to Claude and returns the response
func (c *Client) CreateMessage(ctx context.Context, req *MessageRequest) (*MessageResponse, error) {
	// Set defaults
	if req.Model == "" {
		req.Model = c.model
	}
	if req.MaxTokens == 0 {
		req.MaxTokens = c.maxTokens
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/messages", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", c.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var apiErr struct {
			Error APIError `json:"error"`
		}
		if err := json.Unmarshal(respBody, &apiErr); err != nil {
			return nil, fmt.Errorf("api error (status %d): %s", resp.StatusCode, string(respBody))
		}
		return nil, &apiErr.Error
	}

	var msgResp MessageResponse
	if err := json.Unmarshal(respBody, &msgResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &msgResp, nil
}

// Chat is a convenience method for single-turn conversations
func (c *Client) Chat(ctx context.Context, userMessage string) (string, error) {
	resp, err := c.CreateMessage(ctx, &MessageRequest{
		Messages: []Message{
			{Role: "user", Content: userMessage},
		},
	})
	if err != nil {
		return "", err
	}
	return resp.GetText(), nil
}

// ChatWithSystem is a convenience method with a system prompt
func (c *Client) ChatWithSystem(ctx context.Context, system, userMessage string) (string, error) {
	resp, err := c.CreateMessage(ctx, &MessageRequest{
		System: system,
		Messages: []Message{
			{Role: "user", Content: userMessage},
		},
	})
	if err != nil {
		return "", err
	}
	return resp.GetText(), nil
}

// Conversation manages a multi-turn conversation
type Conversation struct {
	client   *Client
	system   string
	messages []Message
}

// NewConversation creates a new conversation with optional system prompt
func (c *Client) NewConversation(system string) *Conversation {
	return &Conversation{
		client:   c,
		system:   system,
		messages: make([]Message, 0),
	}
}

// Send sends a message and returns the assistant's response
func (conv *Conversation) Send(ctx context.Context, userMessage string) (string, error) {
	conv.messages = append(conv.messages, Message{
		Role:    "user",
		Content: userMessage,
	})

	resp, err := conv.client.CreateMessage(ctx, &MessageRequest{
		System:   conv.system,
		Messages: conv.messages,
	})
	if err != nil {
		// Remove the failed user message
		conv.messages = conv.messages[:len(conv.messages)-1]
		return "", err
	}

	assistantMessage := resp.GetText()
	conv.messages = append(conv.messages, Message{
		Role:    "assistant",
		Content: assistantMessage,
	})

	return assistantMessage, nil
}

// GetMessages returns all messages in the conversation
func (conv *Conversation) GetMessages() []Message {
	return conv.messages
}

// GetTokenCount returns approximate token count (rough estimate)
func (conv *Conversation) GetTokenCount() int {
	count := len(conv.system) / 4 // Rough estimate: 4 chars per token
	for _, msg := range conv.messages {
		count += len(msg.Content) / 4
	}
	return count
}

// Clear clears the conversation history
func (conv *Conversation) Clear() {
	conv.messages = make([]Message, 0)
}
