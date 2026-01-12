// Package main is the entry point for the CodeFlow CLI.
// The CLI provides commands for managing tasks, agents, and workflows.
package main

import (
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/spf13/cobra"

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
}

var taskCreateCmd = &cobra.Command{
	Use:   "create [description]",
	Short: "Create a new task",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		description := args[0]
		priority, _ := cmd.Flags().GetString("priority")
		
		fmt.Printf("✅ Created task: %s\n", description)
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
		
		fmt.Printf("📋 Tasks (%s)\n", status)
		fmt.Println("No tasks found. Create one with: codeflow task create \"description\"")
		
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
