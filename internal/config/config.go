// Package config provides configuration loading and management for CodeFlow.
package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

// Config holds the orchestrator configuration
type Config struct {
	// ConfigPath is the path to the loaded config file
	ConfigPath string

	// Project settings
	ProjectName string `mapstructure:"project_name"`
	ProjectRoot string `mapstructure:"project_root"`

	// Orchestrator settings
	Mode                 string `mapstructure:"mode"`                   // parallel, sequential, hybrid
	MaxConcurrentAgents  int    `mapstructure:"max_concurrent_agents"`
	MaxConcurrentTasks   int    `mapstructure:"max_concurrent_tasks"`
	ConflictResolution   string `mapstructure:"conflict_resolution"`    // crdt, manual, priority-based

	// File paths
	WatchPaths   []string `mapstructure:"watch_paths"`
	EventLogPath string   `mapstructure:"event_log_path"`
	StatePath    string   `mapstructure:"state_path"`

	// Sync settings
	SyncBatchInterval int  `mapstructure:"sync_batch_interval"` // milliseconds
	GitEnabled        bool `mapstructure:"git_enabled"`
	GitBranchPerTask  bool `mapstructure:"git_branch_per_task"`

	// Server settings
	APIPort  int `mapstructure:"api_port"`
	GRPCPort int `mapstructure:"grpc_port"`

	// Logging
	LogLevel string `mapstructure:"log_level"` // debug, info, warn, error
}

// DefaultConfig returns a configuration with sensible defaults
func DefaultConfig() *Config {
	cwd, _ := os.Getwd()
	
	return &Config{
		ProjectName:          "my-project",
		ProjectRoot:          cwd,
		Mode:                 "parallel",
		MaxConcurrentAgents:  3,
		MaxConcurrentTasks:   5,
		ConflictResolution:   "crdt",
		WatchPaths:           []string{".codeflow", ".tasks", ".planning", "src"},
		EventLogPath:         filepath.Join(cwd, ".codeflow", "history"),
		StatePath:            filepath.Join(cwd, ".codeflow", "state.db"),
		SyncBatchInterval:    1000,
		GitEnabled:           true,
		GitBranchPerTask:     true,
		APIPort:              5555,
		GRPCPort:             5556,
		LogLevel:             "info",
	}
}

// Load loads configuration from file and environment
func Load() (*Config, error) {
	cfg := DefaultConfig()

	v := viper.New()
	v.SetConfigName("project")
	v.SetConfigType("yaml")
	v.AddConfigPath(".codeflow")
	v.AddConfigPath(".")

	// Environment variable overrides
	v.SetEnvPrefix("CODEFLOW")
	v.AutomaticEnv()

	// Attempt to read config file
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// No config file found, use defaults
			return cfg, nil
		}
		return nil, fmt.Errorf("error reading config: %w", err)
	}

	// Unmarshal into struct
	if err := v.Unmarshal(cfg); err != nil {
		return nil, fmt.Errorf("error unmarshaling config: %w", err)
	}

	cfg.ConfigPath = v.ConfigFileUsed()

	return cfg, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if c.MaxConcurrentAgents < 1 {
		return fmt.Errorf("max_concurrent_agents must be at least 1")
	}
	if c.MaxConcurrentTasks < 1 {
		return fmt.Errorf("max_concurrent_tasks must be at least 1")
	}
	if c.SyncBatchInterval < 100 {
		return fmt.Errorf("sync_batch_interval must be at least 100ms")
	}
	
	validModes := map[string]bool{"parallel": true, "sequential": true, "hybrid": true}
	if !validModes[c.Mode] {
		return fmt.Errorf("invalid mode: %s (must be parallel, sequential, or hybrid)", c.Mode)
	}

	validResolutions := map[string]bool{"crdt": true, "manual": true, "priority-based": true}
	if !validResolutions[c.ConflictResolution] {
		return fmt.Errorf("invalid conflict_resolution: %s", c.ConflictResolution)
	}

	return nil
}
