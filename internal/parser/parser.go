// Package parser provides YAML parsing and validation for CodeFlow.
package parser

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/xeipuuv/gojsonschema"
	"gopkg.in/yaml.v3"
)

// Parser handles YAML file parsing and validation
type Parser struct {
	schemaDir string
	schemas   map[string]*gojsonschema.Schema
}

// New creates a new Parser with schemas from the given directory
func New(schemaDir string) (*Parser, error) {
	p := &Parser{
		schemaDir: schemaDir,
		schemas:   make(map[string]*gojsonschema.Schema),
	}

	// Load schemas
	schemaFiles := map[string]string{
		"project": "project.schema.json",
		"agents":  "agents.schema.json",
		"task":    "task.schema.json",
	}

	for name, file := range schemaFiles {
		schemaPath := filepath.Join(schemaDir, file)
		if _, err := os.Stat(schemaPath); os.IsNotExist(err) {
			continue // Schema file doesn't exist, skip
		}

		schemaLoader := gojsonschema.NewReferenceLoader("file://" + schemaPath)
		schema, err := gojsonschema.NewSchema(schemaLoader)
		if err != nil {
			return nil, fmt.Errorf("failed to load schema %s: %w", name, err)
		}
		p.schemas[name] = schema
	}

	return p, nil
}

// ParseFile parses a YAML file and optionally validates against schema
func (p *Parser) ParseFile(filePath string, schemaName string, target interface{}) error {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	return p.Parse(data, schemaName, target)
}

// Parse parses YAML data and optionally validates against schema
func (p *Parser) Parse(data []byte, schemaName string, target interface{}) error {
	// First unmarshal to interface{} for validation
	var rawData interface{}
	if err := yaml.Unmarshal(data, &rawData); err != nil {
		return fmt.Errorf("failed to parse YAML: %w", err)
	}

	// Validate against schema if available
	if schema, ok := p.schemas[schemaName]; ok {
		if err := p.validate(rawData, schema); err != nil {
			return err
		}
	}

	// Unmarshal to target struct
	if err := yaml.Unmarshal(data, target); err != nil {
		return fmt.Errorf("failed to unmarshal: %w", err)
	}

	return nil
}

// validate validates data against a JSON schema
func (p *Parser) validate(data interface{}, schema *gojsonschema.Schema) error {
	// Convert to JSON for validation (gojsonschema works with JSON)
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal for validation: %w", err)
	}

	documentLoader := gojsonschema.NewBytesLoader(jsonData)
	result, err := schema.Validate(documentLoader)
	if err != nil {
		return fmt.Errorf("validation error: %w", err)
	}

	if !result.Valid() {
		var errMessages string
		for _, desc := range result.Errors() {
			errMessages += fmt.Sprintf("\n  - %s", desc)
		}
		return fmt.Errorf("validation failed:%s", errMessages)
	}

	return nil
}

// ProjectConfig represents the project.yaml structure
type ProjectConfig struct {
	Metadata struct {
		Version      string    `yaml:"version"`
		ProjectName  string    `yaml:"project_name"`
		CreatedAt    time.Time `yaml:"created_at"`
		LastModified time.Time `yaml:"last_modified"`
		Owner        string    `yaml:"owner"`
	} `yaml:"metadata"`

	Orchestrator struct {
		Version             string `yaml:"version"`
		Mode                string `yaml:"mode"`
		MaxConcurrentAgents int    `yaml:"max_concurrent_agents"`
		MaxConcurrentTasks  int    `yaml:"max_concurrent_tasks"`
		ConflictResolution  string `yaml:"conflict_resolution"`
	} `yaml:"orchestrator"`

	Workspace struct {
		RootDir           string `yaml:"root_dir"`
		GitEnabled        bool   `yaml:"git_enabled"`
		GitBranchPerTask  bool   `yaml:"git_branch_per_task"`
		AutoCommitThreshold int  `yaml:"auto_commit_threshold"`
	} `yaml:"workspace"`

	Integrations struct {
		GitHub struct {
			Enabled  bool   `yaml:"enabled"`
			Owner    string `yaml:"owner"`
			Repo     string `yaml:"repo"`
			APIToken string `yaml:"api_token"`
		} `yaml:"github"`
		Slack struct {
			Enabled    bool     `yaml:"enabled"`
			WebhookURL string   `yaml:"webhook_url"`
			NotifyOn   []string `yaml:"notify_on"`
		} `yaml:"slack"`
	} `yaml:"integrations"`
}

// AgentConfig represents a single agent configuration
type AgentConfig struct {
	ID       string   `yaml:"id"`
	Type     string   `yaml:"type"`
	Enabled  bool     `yaml:"enabled"`
	Provider string   `yaml:"provider"`
	Model    string   `yaml:"model"`

	Capabilities []string `yaml:"capabilities"`

	Constraints struct {
		MaxTokens   int      `yaml:"max_tokens"`
		Temperature float64  `yaml:"temperature"`
		Tools       []string `yaml:"tools"`
	} `yaml:"constraints"`

	FileAccess struct {
		ReadPaths    []string `yaml:"read_paths"`
		WritePaths   []string `yaml:"write_paths"`
		ExcludedPaths []string `yaml:"excluded_paths"`
	} `yaml:"file_access"`

	TaskAssignment struct {
		Specializations     []string `yaml:"specializations"`
		SkillLevel          string   `yaml:"skill_level"`
		ParallelizableTasks int      `yaml:"parallelizable_tasks"`
	} `yaml:"task_assignment"`

	ContextStrategy string `yaml:"context_strategy"`
}

// AgentsConfig represents the agents.yaml structure
type AgentsConfig struct {
	Agents map[string]AgentConfig `yaml:"agents"`

	SyncSettings struct {
		ConflictResolution struct {
			Strategy              string `yaml:"strategy"`
			MergeDelay            int    `yaml:"merge_delay"`
			ManualReviewThreshold string `yaml:"manual_review_threshold"`
		} `yaml:"conflict_resolution"`
		StatePersistence struct {
			Backend  string `yaml:"backend"`
			Location string `yaml:"location"`
		} `yaml:"state_persistence"`
	} `yaml:"sync_settings"`
}

// TaskConfig represents a task YAML file
type TaskConfig struct {
	ID          string `yaml:"id"`
	Name        string `yaml:"name"`
	Description string `yaml:"description"`

	Metadata struct {
		CreatedAt        time.Time `yaml:"created_at"`
		Priority         string    `yaml:"priority"`
		Status           string    `yaml:"status"`
		AssignedAgents   []string  `yaml:"assigned_agents"`
		EstimatedDuration string   `yaml:"estimated_duration"`
		ActualDuration   string    `yaml:"actual_duration"`
	} `yaml:"metadata"`

	Planning struct {
		Goals              []string `yaml:"goals"`
		AcceptanceCriteria []string `yaml:"acceptance_criteria"`
		Constraints        []string `yaml:"constraints"`
		Dependencies       []string `yaml:"dependencies"`
	} `yaml:"planning"`

	Scope struct {
		FilesToCreate []string `yaml:"files_to_create"`
		FilesToModify []string `yaml:"files_to_modify"`
		Architecture  struct {
			Pattern    string   `yaml:"pattern"`
			Interfaces []string `yaml:"interfaces"`
		} `yaml:"architecture"`
		TechStack struct {
			Language  string   `yaml:"language"`
			Framework string   `yaml:"framework"`
			Database  string   `yaml:"database"`
			Libraries []string `yaml:"libraries"`
		} `yaml:"tech_stack"`
	} `yaml:"scope"`

	Execution struct {
		AgentAssignments map[string]struct {
			Tasks      []string  `yaml:"tasks"`
			Status     string    `yaml:"status"`
			AssignedAt time.Time `yaml:"assigned_at"`
		} `yaml:"agent_assignments"`

		Subtasks []struct {
			ID         string   `yaml:"id"`
			Name       string   `yaml:"name"`
			AssignedTo string   `yaml:"assigned_to"`
			Status     string   `yaml:"status"`
			Progress   int      `yaml:"progress"`
			Files      []string `yaml:"files"`
		} `yaml:"subtasks"`
	} `yaml:"execution"`

	Outputs struct {
		FilesCreated  []string `yaml:"files_created"`
		FilesModified []string `yaml:"files_modified"`
		Branches      struct {
			Working  string `yaml:"working"`
			PRNumber *int   `yaml:"pr_number"`
		} `yaml:"branches"`
		QualityMetrics struct {
			TestCoverage  float64 `yaml:"test_coverage"`
			LintScore     float64 `yaml:"lint_score"`
			SecurityScore float64 `yaml:"security_score"`
		} `yaml:"quality_metrics"`
	} `yaml:"outputs"`

	CostTracking struct {
		EstimatedTokens int     `yaml:"estimated_tokens"`
		ActualTokens    int     `yaml:"actual_tokens"`
		EstimatedCostUSD float64 `yaml:"estimated_cost_usd"`
		ActualCostUSD   float64 `yaml:"actual_cost_usd"`
	} `yaml:"cost_tracking"`

	Rollback struct {
		Enabled          bool   `yaml:"enabled"`
		GitCheckpoint    string `yaml:"git_checkpoint"`
		RestoreOnFailure bool   `yaml:"restore_on_failure"`
	} `yaml:"rollback"`
}

// LoadProject loads and validates a project.yaml file
func (p *Parser) LoadProject(filePath string) (*ProjectConfig, error) {
	var config ProjectConfig
	if err := p.ParseFile(filePath, "project", &config); err != nil {
		return nil, err
	}
	return &config, nil
}

// LoadAgents loads and validates an agents.yaml file
func (p *Parser) LoadAgents(filePath string) (*AgentsConfig, error) {
	var config AgentsConfig
	if err := p.ParseFile(filePath, "agents", &config); err != nil {
		return nil, err
	}
	return &config, nil
}

// LoadTask loads and validates a task YAML file
func (p *Parser) LoadTask(filePath string) (*TaskConfig, error) {
	var config TaskConfig
	if err := p.ParseFile(filePath, "task", &config); err != nil {
		return nil, err
	}
	return &config, nil
}

// WriteYAML writes a struct to a YAML file
func WriteYAML(filePath string, data interface{}) error {
	yamlData, err := yaml.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	if err := os.WriteFile(filePath, yamlData, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}
