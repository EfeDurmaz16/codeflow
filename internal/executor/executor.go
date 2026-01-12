// Package executor handles task execution with agents.
package executor

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/codeflow/orchestrator/internal/agent/claude"
	"github.com/codeflow/orchestrator/internal/git"
	"github.com/codeflow/orchestrator/internal/parser"
)

// Executor handles end-to-end task execution
type Executor struct {
	projectRoot string
	schemaDir   string
	parser      *parser.Parser
}

// New creates a new Executor
func New(projectRoot string) (*Executor, error) {
	schemaDir := filepath.Join(projectRoot, "schemas")
	p, err := parser.New(schemaDir)
	if err != nil {
		p, _ = parser.New("")
	}

	return &Executor{
		projectRoot: projectRoot,
		schemaDir:   schemaDir,
		parser:      p,
	}, nil
}

// ExecuteTask runs a task with Claude
func (e *Executor) ExecuteTask(ctx context.Context, taskPath, apiKey string) (*ExecutionResult, error) {
	// Load task
	task, err := e.parser.LoadTask(taskPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load task: %w", err)
	}

	result := &ExecutionResult{
		TaskID:    task.ID,
		TaskName:  task.Name,
		StartedAt: time.Now(),
	}

	// Create git branch if git is enabled
	repo := git.New(e.projectRoot)
	if repo.IsGitRepo() {
		branchName, err := repo.CreateTaskBranch(task.ID, task.Name)
		if err == nil {
			result.GitBranch = branchName
		}
	}

	// Build prompt from task
	prompt := e.buildPrompt(task)
	system := e.buildSystemPrompt(task)

	// Execute with Claude
	client := claude.NewClient(apiKey)
	
	response, err := client.ChatWithSystem(ctx, system, prompt)
	if err != nil {
		result.Error = err.Error()
		result.Status = "failed"
		return result, nil
	}

	result.Response = response
	result.EndedAt = time.Now()
	result.Status = "completed"

	// Save result
	resultPath := filepath.Join(filepath.Dir(taskPath), fmt.Sprintf("%s-result.md", task.ID))
	if err := e.saveResult(resultPath, result); err != nil {
		fmt.Printf("Warning: failed to save result: %v\n", err)
	}
	result.ResultPath = resultPath

	// Git commit if enabled
	if result.GitBranch != "" {
		repo.AddAll()
		repo.AutoCommit("claude", task.ID, "Task execution completed")
	}

	return result, nil
}

// ExecutionResult holds the result of task execution
type ExecutionResult struct {
	TaskID     string
	TaskName   string
	Status     string
	Response   string
	Error      string
	StartedAt  time.Time
	EndedAt    time.Time
	GitBranch  string
	ResultPath string
}

// Duration returns execution duration
func (r *ExecutionResult) Duration() time.Duration {
	if r.EndedAt.IsZero() {
		return time.Since(r.StartedAt)
	}
	return r.EndedAt.Sub(r.StartedAt)
}

// buildPrompt creates the prompt for Claude
func (e *Executor) buildPrompt(task *parser.TaskConfig) string {
	var sb strings.Builder

	sb.WriteString("# Task: ")
	sb.WriteString(task.Name)
	sb.WriteString("\n\n")

	if task.Description != "" {
		sb.WriteString("## Description\n")
		sb.WriteString(task.Description)
		sb.WriteString("\n\n")
	}

	if len(task.Planning.Goals) > 0 {
		sb.WriteString("## Goals\n")
		for _, goal := range task.Planning.Goals {
			sb.WriteString("- ")
			sb.WriteString(goal)
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}

	if len(task.Planning.AcceptanceCriteria) > 0 {
		sb.WriteString("## Acceptance Criteria\n")
		for _, ac := range task.Planning.AcceptanceCriteria {
			sb.WriteString("- ")
			sb.WriteString(ac)
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}

	if len(task.Scope.FilesToCreate) > 0 {
		sb.WriteString("## Files to Create\n")
		for _, f := range task.Scope.FilesToCreate {
			sb.WriteString("- ")
			sb.WriteString(f)
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}

	if len(task.Scope.FilesToModify) > 0 {
		sb.WriteString("## Files to Modify\n")
		for _, f := range task.Scope.FilesToModify {
			sb.WriteString("- ")
			sb.WriteString(f)
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}

	sb.WriteString("Please provide the implementation.\n")

	return sb.String()
}

// buildSystemPrompt creates the system prompt
func (e *Executor) buildSystemPrompt(task *parser.TaskConfig) string {
	var sb strings.Builder

	sb.WriteString("You are an expert software engineer working on a coding task.\n\n")

	if task.Scope.TechStack.Language != "" {
		sb.WriteString(fmt.Sprintf("Primary language: %s\n", task.Scope.TechStack.Language))
	}
	if task.Scope.TechStack.Framework != "" {
		sb.WriteString(fmt.Sprintf("Framework: %s\n", task.Scope.TechStack.Framework))
	}

	sb.WriteString("\nProvide complete, working code. Include:\n")
	sb.WriteString("1. The full implementation\n")
	sb.WriteString("2. Any necessary imports\n")
	sb.WriteString("3. Brief comments explaining complex logic\n")
	sb.WriteString("4. Example usage if appropriate\n")

	return sb.String()
}

// saveResult saves the execution result to a file
func (e *Executor) saveResult(path string, result *ExecutionResult) error {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("# Task Result: %s\n\n", result.TaskName))
	sb.WriteString(fmt.Sprintf("**Task ID:** %s\n", result.TaskID))
	sb.WriteString(fmt.Sprintf("**Status:** %s\n", result.Status))
	sb.WriteString(fmt.Sprintf("**Duration:** %s\n", result.Duration().Round(time.Second)))
	
	if result.GitBranch != "" {
		sb.WriteString(fmt.Sprintf("**Git Branch:** %s\n", result.GitBranch))
	}
	sb.WriteString("\n---\n\n")
	sb.WriteString("## Response\n\n")
	sb.WriteString(result.Response)

	if result.Error != "" {
		sb.WriteString("\n\n## Error\n\n")
		sb.WriteString(result.Error)
	}

	return os.WriteFile(path, []byte(sb.String()), 0644)
}

// QuickExecute is a simple function to execute a prompt with Claude
func QuickExecute(ctx context.Context, apiKey, prompt string) (string, error) {
	client := claude.NewClient(apiKey)
	return client.Chat(ctx, prompt)
}
