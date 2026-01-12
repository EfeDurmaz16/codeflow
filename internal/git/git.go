// Package git provides Git operations for CodeFlow.
package git

import (
	"bytes"
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// Repo represents a Git repository
type Repo struct {
	path string
}

// New creates a new Repo for the given path
func New(path string) *Repo {
	return &Repo{path: path}
}

// IsGitRepo checks if the path is a git repository
func (r *Repo) IsGitRepo() bool {
	_, err := r.run("rev-parse", "--git-dir")
	return err == nil
}

// Init initializes a new git repository
func (r *Repo) Init() error {
	_, err := r.run("init")
	return err
}

// CurrentBranch returns the current branch name
func (r *Repo) CurrentBranch() (string, error) {
	out, err := r.run("rev-parse", "--abbrev-ref", "HEAD")
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(out), nil
}

// CreateBranch creates a new branch
func (r *Repo) CreateBranch(name string) error {
	_, err := r.run("checkout", "-b", name)
	return err
}

// SwitchBranch switches to an existing branch
func (r *Repo) SwitchBranch(name string) error {
	_, err := r.run("checkout", name)
	return err
}

// BranchExists checks if a branch exists
func (r *Repo) BranchExists(name string) bool {
	_, err := r.run("rev-parse", "--verify", name)
	return err == nil
}

// CreateTaskBranch creates a branch for a task
func (r *Repo) CreateTaskBranch(taskID, taskName string) (string, error) {
	// Generate branch name
	branchName := fmt.Sprintf("task/%s-%s", taskID, slugify(taskName))

	if r.BranchExists(branchName) {
		// Switch to existing branch
		if err := r.SwitchBranch(branchName); err != nil {
			return "", err
		}
		return branchName, nil
	}

	// Create new branch
	if err := r.CreateBranch(branchName); err != nil {
		return "", err
	}

	return branchName, nil
}

// Add stages files for commit
func (r *Repo) Add(paths ...string) error {
	args := append([]string{"add"}, paths...)
	_, err := r.run(args...)
	return err
}

// AddAll stages all changes
func (r *Repo) AddAll() error {
	_, err := r.run("add", "-A")
	return err
}

// Commit creates a commit with the given message
func (r *Repo) Commit(message string) error {
	_, err := r.run("commit", "-m", message)
	return err
}

// CommitWithAuthor creates a commit with a specific author
func (r *Repo) CommitWithAuthor(message, author, email string) error {
	authorStr := fmt.Sprintf("%s <%s>", author, email)
	_, err := r.run("commit", "-m", message, "--author", authorStr)
	return err
}

// AutoCommit creates an automatic commit for agent changes
func (r *Repo) AutoCommit(agentID, taskID, description string) error {
	message := fmt.Sprintf("[%s] %s\n\nTask: %s\nTimestamp: %s",
		agentID, description, taskID, time.Now().Format(time.RFC3339))
	
	return r.CommitWithAuthor(message, fmt.Sprintf("Agent: %s", agentID), "agent@codeflow.dev")
}

// Status returns the git status
func (r *Repo) Status() (string, error) {
	return r.run("status", "--porcelain")
}

// HasChanges checks if there are uncommitted changes
func (r *Repo) HasChanges() (bool, error) {
	status, err := r.Status()
	if err != nil {
		return false, err
	}
	return len(strings.TrimSpace(status)) > 0, nil
}

// Diff returns the diff of staged changes
func (r *Repo) Diff() (string, error) {
	return r.run("diff", "--staged")
}

// DiffFiles returns the list of changed files
func (r *Repo) DiffFiles() ([]string, error) {
	out, err := r.run("diff", "--name-only", "--staged")
	if err != nil {
		return nil, err
	}

	lines := strings.Split(strings.TrimSpace(out), "\n")
	files := make([]string, 0)
	for _, line := range lines {
		if line != "" {
			files = append(files, line)
		}
	}
	return files, nil
}

// Log returns recent commit history
func (r *Repo) Log(count int) (string, error) {
	return r.run("log", fmt.Sprintf("-n%d", count), "--oneline")
}

// GetCommitHash returns the current commit hash
func (r *Repo) GetCommitHash() (string, error) {
	out, err := r.run("rev-parse", "HEAD")
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(out), nil
}

// GetShortHash returns the short commit hash
func (r *Repo) GetShortHash() (string, error) {
	out, err := r.run("rev-parse", "--short", "HEAD")
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(out), nil
}

// Stash stashes current changes
func (r *Repo) Stash() error {
	_, err := r.run("stash")
	return err
}

// StashPop pops the latest stash
func (r *Repo) StashPop() error {
	_, err := r.run("stash", "pop")
	return err
}

// Merge merges a branch into the current branch
func (r *Repo) Merge(branch string) error {
	_, err := r.run("merge", branch)
	return err
}

// MergeNoCommit merges without committing
func (r *Repo) MergeNoCommit(branch string) error {
	_, err := r.run("merge", "--no-commit", branch)
	return err
}

// AbortMerge aborts an in-progress merge
func (r *Repo) AbortMerge() error {
	_, err := r.run("merge", "--abort")
	return err
}

// HasConflicts checks if there are merge conflicts
func (r *Repo) HasConflicts() (bool, error) {
	out, err := r.run("diff", "--name-only", "--diff-filter=U")
	if err != nil {
		return false, err
	}
	return len(strings.TrimSpace(out)) > 0, nil
}

// GetConflictFiles returns list of files with conflicts
func (r *Repo) GetConflictFiles() ([]string, error) {
	out, err := r.run("diff", "--name-only", "--diff-filter=U")
	if err != nil {
		return nil, err
	}

	lines := strings.Split(strings.TrimSpace(out), "\n")
	files := make([]string, 0)
	for _, line := range lines {
		if line != "" {
			files = append(files, line)
		}
	}
	return files, nil
}

// Reset resets to a specific commit
func (r *Repo) Reset(commit string, hard bool) error {
	args := []string{"reset"}
	if hard {
		args = append(args, "--hard")
	}
	args = append(args, commit)
	_, err := r.run(args...)
	return err
}

// run executes a git command
func (r *Repo) run(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = r.path

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		return "", fmt.Errorf("git %s: %s", strings.Join(args, " "), stderr.String())
	}

	return stdout.String(), nil
}

// slugify converts a string to URL-friendly format
func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	result := ""
	for _, c := range s {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' {
			result += string(c)
		}
	}
	for strings.Contains(result, "--") {
		result = strings.ReplaceAll(result, "--", "-")
	}
	if len(result) > 30 {
		result = result[:30]
	}
	return strings.Trim(result, "-")
}

// Clone clones a repository
func Clone(url, destPath string) (*Repo, error) {
	cmd := exec.Command("git", "clone", url, destPath)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("git clone: %s", stderr.String())
	}

	return New(filepath.Clean(destPath)), nil
}
