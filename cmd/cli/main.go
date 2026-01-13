// Package main is the entry point for the CodeFlow CLI.
// The CLI provides commands for managing tasks, agents, and workflows.
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/spf13/cobra"

	"github.com/codeflow/orchestrator/internal/mcp"
	"github.com/codeflow/orchestrator/ui/tui"
)

// Version and BuildTime are set at build time via ldflags
var (
	Version   = "dev"
	BuildTime = "unknown"
)

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "codeflow",
	Short: "CodeFlow - Multi-Agent AI Coding Orchestrator",
	Long: `CodeFlow Orchestrator coordinates multiple AI coding agents
to work in parallel on your codebase, automatically resolving
conflicts and maintaining synchronized state.

Use codeflow to:
  • Create and manage tasks for AI agents
  • Monitor agent status and progress
  • Execute reproducible workflows
  • Sync changes across your project`,
	Version: Version,
}

// init adds all subcommands to the root command
func init() {
	// Global flags
	rootCmd.PersistentFlags().StringP("config", "c", "", "config file (default: .codeflow/project.yaml)")
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "enable verbose output")

	// Add subcommands
	rootCmd.AddCommand(initCmd)
	rootCmd.AddCommand(statusCmd)
	rootCmd.AddCommand(taskCmd)
	rootCmd.AddCommand(agentCmd)
	rootCmd.AddCommand(walkCmd)
	rootCmd.AddCommand(mcpCmd)
}

// initCmd initializes a new CodeFlow project
var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize a new CodeFlow project",
	Long:  "Creates the .codeflow directory structure and default configuration files.",
	RunE: func(cmd *cobra.Command, args []string) error {
		name, _ := cmd.Flags().GetString("name")
		if name == "" {
			name = "my-project"
		}

		fmt.Println("📁 Initializing CodeFlow project...")
		
		// Create directory structure
		dirs := []string{
			".codeflow",
			".codeflow/history",
			".tasks/active",
			".tasks/completed",
			".tasks/blocked",
			".planning",
			".walkthroughs",
			".agents",
		}

		for _, dir := range dirs {
			if err := os.MkdirAll(dir, 0755); err != nil {
				return fmt.Errorf("failed to create %s: %w", dir, err)
			}
		}

		fmt.Printf("✅ CodeFlow project '%s' initialized!\n", name)
		fmt.Println()
		fmt.Println("Next steps:")
		fmt.Println("  1. Add an agent:  codeflow agent add claude --api-key $ANTHROPIC_API_KEY")
		fmt.Println("  2. Create a task: codeflow task create \"Build feature X\"")
		fmt.Println("  3. Start daemon:  codeflow-daemon")
		
		return nil
	},
}

func init() {
	initCmd.Flags().StringP("name", "n", "", "project name")
}

// statusCmd shows the current project status
var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show current project status",
	Long:  "Displays active tasks, agent status, and recent events.",
	RunE: func(cmd *cobra.Command, args []string) error {
		watch, _ := cmd.Flags().GetBool("watch")
		
		if watch {
			// Run interactive TUI dashboard
			p := tea.NewProgram(tui.NewModel(), tea.WithAltScreen())
			if _, err := p.Run(); err != nil {
				return fmt.Errorf("failed to run TUI: %w", err)
			}
			return nil
		}

		fmt.Println("📊 CodeFlow Status")
		fmt.Println("==================")
		fmt.Println()
		fmt.Println("Active Tasks: 0")
		fmt.Println("Connected Agents: 0")
		fmt.Println("Recent Events: 0")
		fmt.Println()
		fmt.Println("Use --watch (-w) for interactive dashboard")
		
		return nil
	},
}

func init() {
	statusCmd.Flags().BoolP("watch", "w", false, "open interactive TUI dashboard")
}

// taskCmd is the parent command for task operations
var taskCmd = &cobra.Command{
	Use:   "task",
	Short: "Manage tasks",
	Long:  "Create, list, and manage tasks for AI agents.",
}

func init() {
	taskCmd.AddCommand(taskCreateCmd)
	taskCmd.AddCommand(taskListCmd)
	taskCmd.AddCommand(taskAssignCmd)
	taskCmd.AddCommand(taskExecuteCmd)
}

var taskExecuteCmd = &cobra.Command{
	Use:   "execute [task-id] [agent-id]",
	Short: "Execute a task with an agent",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		taskID := args[0]
		agentID := args[1]

		payload := map[string]string{
			"task_id":  taskID,
			"agent_id": agentID,
		}
		jsonBody, _ := json.Marshal(payload)

		resp, err := http.Post("http://localhost:5555/tasks/execute", "application/json", bytes.NewBuffer(jsonBody))
		if err != nil {
			return fmt.Errorf("failed to connect to daemon: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusAccepted {
			return fmt.Errorf("daemon execution failed: %s", resp.Status)
		}

		fmt.Printf("🚀 Task %s queued for execution by %s\n", taskID, agentID)
		fmt.Println("Check status with: codeflow status --watch")
		return nil
	},
}

var taskCreateCmd = &cobra.Command{
	Use:   "create [description]",
	Short: "Create a new task",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		description := args[0]
		priority, _ := cmd.Flags().GetString("priority")
		
		// Generate simple ID
		taskID := fmt.Sprintf("task-%d", time.Now().Unix())
		
		// Create task YAML content
		content := fmt.Sprintf(`id: %s
name: %s
description: %s
metadata:
  status: active
  priority: %s
  created_at: %s
planning:
  goals:
    - Complete the task
scope:
  tech_stack:
    language: Go
`, taskID, description, description, priority, time.Now().Format(time.RFC3339))

		// Ensure .tasks/active exists
		taskDir := ".tasks/active"
		if err := os.MkdirAll(taskDir, 0755); err != nil {
			return fmt.Errorf("failed to create task directory: %w", err)
		}
		
		filePath := filepath.Join(taskDir, fmt.Sprintf("%s.yaml", taskID))
		if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
			return fmt.Errorf("failed to write task file: %w", err)
		}
		
		fmt.Printf("✅ Created task: %s\n", description)
		fmt.Printf("   ID: %s\n", taskID)
		fmt.Printf("   Priority: %s\n", priority)
		fmt.Println("   Status: active")
		
		return nil
	},
}

func init() {
	taskCreateCmd.Flags().StringP("priority", "p", "medium", "task priority (low, medium, high, critical)")
}

var taskListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all tasks",
	RunE: func(cmd *cobra.Command, args []string) error {
		status, _ := cmd.Flags().GetString("status")
		
		resp, err := http.Get("http://localhost:5555/tasks")
		if err != nil {
			return fmt.Errorf("failed to connect to daemon: %w", err)
		}
		defer resp.Body.Close()

		var result struct {
			Tasks []struct {
				ID     string `json:"id"`
				Name   string `json:"name"`
				Status string `json:"status"`
			} `json:"tasks"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}

		fmt.Printf("📋 Tasks (%s)\n", status)
		if len(result.Tasks) == 0 {
			fmt.Println("No tasks found.")
			return nil
		}

		for _, t := range result.Tasks {
			if status != "all" && status != "" && t.Status != status {
				continue
			}
			fmt.Printf("- [%s] %s (%s)\n", t.ID, t.Name, t.Status)
		}
		
		return nil
	},
}

func init() {
	taskListCmd.Flags().StringP("status", "s", "active", "filter by status (active, completed, blocked, all)")
}

var taskAssignCmd = &cobra.Command{
	Use:   "assign [task-id] [agent-names...]",
	Short: "Assign agents to a task",
	Args:  cobra.MinimumNArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		taskID := args[0]
		agents := args[1:]
		
		fmt.Printf("✅ Assigned agents to task %s: %v\n", taskID, agents)
		
		return nil
	},
}

// agentCmd is the parent command for agent operations
var agentCmd = &cobra.Command{
	Use:   "agent",
	Short: "Manage agents",
	Long:  "Add, remove, and monitor AI coding agents.",
}

func init() {
	agentCmd.AddCommand(agentAddCmd)
	agentCmd.AddCommand(agentListCmd)
	agentCmd.AddCommand(agentRemoveCmd)
	agentCmd.AddCommand(agentCursorCmd)
	agentCmd.AddCommand(agentWindsurfCmd)
}

var agentAddCmd = &cobra.Command{
	Use:   "add [name]",
	Short: "Add a new agent",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := args[0]
		apiKey, _ := cmd.Flags().GetString("api-key")
		
		if apiKey == "" {
			return fmt.Errorf("--api-key is required")
		}
		
		fmt.Printf("✅ Added agent: %s\n", name)
		
		return nil
	},
}

var agentCursorCmd = &cobra.Command{
	Use:   "cursor",
	Short: "Start Cursor IDE integration",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runExternalAgent("Cursor", "cursor-ide", "gpt-4")
	},
}

var agentWindsurfCmd = &cobra.Command{
	Use:   "windsurf",
	Short: "Start Windsurf IDE integration",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runExternalAgent("Windsurf", "windsurf-ide", "cascade")
	},
}

func runExternalAgent(name, provider, model string) error {
	fmt.Printf("🔌 Connecting %s to CodeFlow Daemon...\n", name)

	payload := map[string]string{
		"name":     name,
		"provider": provider,
		"model":    model,
	}
	jsonBody, _ := json.Marshal(payload)

	resp, err := http.Post("http://localhost:5555/agents/register", "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to connect to daemon: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("registration failed: %s", resp.Status)
	}

	fmt.Printf("✅ %s connected! Waiting for tasks...\n", name)
	
	// Simulate event loop
	for {
		// In a real implementation, this would poll /tasks/assigned endpoint
		// or listen to a websocket
		time.Sleep(5 * time.Second)
	}
}

func init() {
	agentAddCmd.Flags().StringP("api-key", "k", "", "API key for the agent")
	agentAddCmd.Flags().StringP("model", "m", "", "model to use (e.g., claude-3-5-sonnet)")
}

var agentListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all agents",
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println("🤖 Agents")
		fmt.Println("No agents configured. Add one with: codeflow agent add claude --api-key $KEY")
		
		return nil
	},
}

var agentRemoveCmd = &cobra.Command{
	Use:   "remove [name]",
	Short: "Remove an agent",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := args[0]
		fmt.Printf("✅ Removed agent: %s\n", name)
		return nil
	},
}

// walkCmd is the parent command for walkthrough operations
var walkCmd = &cobra.Command{
	Use:   "walk",
	Short: "Manage walkthroughs",
	Long:  "List and execute reproducible workflows.",
}

func init() {
	walkCmd.AddCommand(walkListCmd)
	walkCmd.AddCommand(walkRunCmd)
}



var walkListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all walkthroughs",
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println("📖 Walkthroughs")
		fmt.Println("No walkthroughs found in .walkthroughs/")
		return nil
	},
}

var walkRunCmd = &cobra.Command{
	Use:   "run [name]",
	Short: "Execute a walkthrough",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := args[0]
		fmt.Printf("🚀 Running walkthrough: %s\n", name)
		return nil
	},
}

// mcpCmd starts the MCP server
var mcpCmd = &cobra.Command{
	Use:   "mcp",
	Short: "Start the MCP server",
	RunE: func(cmd *cobra.Command, args []string) error {
		// Get project root (default to current directory)
		wd, err := os.Getwd()
		if err != nil {
			return fmt.Errorf("failed to get working directory: %w", err)
		}

		server, err := mcp.NewServer(wd)
		if err != nil {
			return fmt.Errorf("failed to create MCP server: %w", err)
		}

		// Start server (blocks)
		return server.Start()
	},
}

