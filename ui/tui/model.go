// Package tui provides the terminal user interface for CodeFlow.
package tui

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/charmbracelet/bubbles/spinner"
	"github.com/charmbracelet/bubbles/table"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// View represents the current TUI view
type View string

const (
	ViewDashboard  View = "dashboard"
	ViewTaskDetail View = "task_detail"
	ViewAgentList  View = "agent_list"
	ViewLogs       View = "logs"
)

// DaemonStats from the API
type DaemonStats struct {
	ActiveTasks     int  `json:"active_tasks"`
	CompletedTasks  int  `json:"completed_tasks"`
	ConnectedAgents int  `json:"connected_agents"`
	DaemonOnline    bool `json:"-"`
}

// Model is the main TUI model
type Model struct {
	// Current view
	view View

	// Dimensions
	width  int
	height int

	// Components
	spinner   spinner.Model
	taskTable table.Model

	// State
	tasks      []TaskItem
	agents     []AgentItem
	logs       []LogItem
	selectedID string
	stats      DaemonStats

	// Status
	ready bool
	err   error
}

// TaskItem represents a task in the UI
type TaskItem struct {
	ID       string
	Name     string
	Status   string
	Progress int
	Agent    string
}

// AgentItem represents an agent in the UI
type AgentItem struct {
	Name      string
	Status    string
	Model     string
	TaskCount int
}

// LogItem represents a log entry
type LogItem struct {
	Time    string
	Type    string
	Message string
}

// Messages for tea.Cmd
type tickMsg time.Time
type statsMsg DaemonStats

func doTick() tea.Cmd {
	return tea.Tick(2*time.Second, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func fetchStats() tea.Cmd {
	return func() tea.Msg {
		client := &http.Client{Timeout: 1 * time.Second}
		resp, err := client.Get("http://localhost:5555/stats")
		if err != nil {
			return statsMsg{DaemonOnline: false}
		}
		defer resp.Body.Close()

		var stats DaemonStats
		if err := json.NewDecoder(resp.Body).Decode(&stats); err != nil {
			return statsMsg{DaemonOnline: false}
		}
		stats.DaemonOnline = true
		return statsMsg(stats)
	}
}

// NewModel creates a new TUI model
func NewModel() Model {
	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = lipgloss.NewStyle().Foreground(lipgloss.Color(colorPrimary))

	columns := []table.Column{
		{Title: "ID", Width: 8},
		{Title: "Task Name", Width: 30},
		{Title: "Status", Width: 12},
		{Title: "Progress", Width: 12},
		{Title: "Agent", Width: 12},
	}

	t := table.New(
		table.WithColumns(columns),
		table.WithFocused(true),
		table.WithHeight(7),
	)

	tableStyle := table.DefaultStyles()
	tableStyle.Header = tableStyle.Header.
		BorderStyle(lipgloss.NormalBorder()).
		BorderForeground(lipgloss.Color(colorSubtle)).
		BorderBottom(true).
		Bold(true)
	tableStyle.Selected = tableStyle.Selected.
		Foreground(lipgloss.Color(colorText)).
		Background(lipgloss.Color(colorPrimary)).
		Bold(false)
	t.SetStyles(tableStyle)

	return Model{
		view:      ViewDashboard,
		spinner:   s,
		taskTable: t,
		tasks: []TaskItem{
			{ID: "001", Name: "OAuth2 Authentication", Status: "▶ Running", Progress: 75, Agent: "Claude"},
			{ID: "002", Name: "Database Migration", Status: "✓ Done", Progress: 100, Agent: "-"},
			{ID: "003", Name: "API Endpoints", Status: "⧖ Queued", Progress: 0, Agent: "Windsurf"},
		},
		agents: []AgentItem{
			{Name: "Claude", Status: "✓ Connected", Model: "claude-3-5-sonnet", TaskCount: 2},
			{Name: "Cursor", Status: "⚠ Disconnected", Model: "gpt-4", TaskCount: 0},
			{Name: "Windsurf", Status: "✓ Connected", Model: "cascade", TaskCount: 1},
		},
		logs: []LogItem{
			{Time: "12:34:56", Type: "✓", Message: "Task 001 (subtask 3) completed by Claude"},
			{Time: "12:33:22", Type: "⧖", Message: "Task 003 assigned to Windsurf"},
			{Time: "12:32:11", Type: "⚠", Message: "Minor conflict detected (auto-resolved via CRDT)"},
		},
	}
}

// Init initializes the TUI
func (m Model) Init() tea.Cmd {
	return tea.Batch(m.spinner.Tick, doTick(), fetchStats())
}

// Update handles messages
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	var cmds []tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "1":
			m.view = ViewDashboard
		case "2":
			m.view = ViewTaskDetail
		case "3":
			m.view = ViewAgentList
		case "4":
			m.view = ViewLogs
		case "r":
			cmds = append(cmds, fetchStats())
		}

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.ready = true

	case tickMsg:
		cmds = append(cmds, doTick(), fetchStats())

	case statsMsg:
		m.stats = DaemonStats(msg)
	}

	// Update spinner
	m.spinner, cmd = m.spinner.Update(msg)
	cmds = append(cmds, cmd)

	// Update table
	m.taskTable, cmd = m.taskTable.Update(msg)
	cmds = append(cmds, cmd)

	return m, tea.Batch(cmds...)
}

// View renders the TUI
func (m Model) View() string {
	if !m.ready {
		return "\n  Initializing..."
	}

	switch m.view {
	case ViewDashboard:
		return m.dashboardView()
	case ViewTaskDetail:
		return m.taskDetailView()
	case ViewAgentList:
		return m.agentListView()
	case ViewLogs:
		return m.logsView()
	default:
		return m.dashboardView()
	}
}

// dashboardView renders the main dashboard
func (m Model) dashboardView() string {
	s := styles

	// Daemon status
	daemonStatus := s.Error.Render("● Daemon Offline")
	if m.stats.DaemonOnline {
		daemonStatus = s.Success.Render("● Daemon Online")
	}

	// Header
	header := s.Header.Render("CodeFlow Dashboard") + "                    " + daemonStatus

	// Live stats from daemon
	liveStats := ""
	if m.stats.DaemonOnline {
		liveStats = fmt.Sprintf("\n  📊 Live: %d active, %d completed | %d agents connected\n",
			m.stats.ActiveTasks, m.stats.CompletedTasks, m.stats.ConnectedAgents)
	}

	// Task table
	rows := make([]table.Row, len(m.tasks))
	for i, task := range m.tasks {
		progressBar := renderProgress(task.Progress)
		rows[i] = table.Row{task.ID, task.Name, task.Status, progressBar, task.Agent}
	}
	m.taskTable.SetRows(rows)

	taskSection := s.SectionTitle.Render("Active Tasks") + liveStats + "\n" + m.taskTable.View()

	// Agent status
	agentSection := s.SectionTitle.Render("Agent Status") + "\n"
	for _, agent := range m.agents {
		statusStyle := s.Success
		if agent.Status == "⚠ Disconnected" {
			statusStyle = s.Warning
		}
		agentSection += fmt.Sprintf("  %s  %s  [%s]  Tasks: %d\n",
			statusStyle.Render(agent.Status),
			s.Bold.Render(agent.Name),
			s.Subtle.Render(agent.Model),
			agent.TaskCount,
		)
	}

	// Recent events
	logSection := s.SectionTitle.Render("Recent Events") + "\n"
	for _, log := range m.logs {
		logSection += fmt.Sprintf("  [%s] %s %s\n",
			s.Subtle.Render(log.Time),
			log.Type,
			log.Message,
		)
	}

	// Footer
	footer := s.Footer.Render("1 Dashboard  2 Tasks  3 Agents  4 Logs  r Refresh  q Quit")

	return lipgloss.JoinVertical(lipgloss.Left,
		header,
		"",
		taskSection,
		"",
		agentSection,
		"",
		logSection,
		"",
		footer,
	)
}

// taskDetailView renders task details
func (m Model) taskDetailView() string {
	return styles.Header.Render("Task Detail") + "\n\nSelect a task from the dashboard to view details.\n\n" +
		styles.Footer.Render("1 Dashboard  q Quit")
}

// agentListView renders the agent list
func (m Model) agentListView() string {
	return styles.Header.Render("Agent List") + "\n\nConnected agents will appear here.\n\n" +
		styles.Footer.Render("1 Dashboard  q Quit")
}

// logsView renders log entries
func (m Model) logsView() string {
	return styles.Header.Render("Event Logs") + "\n\nEvent history will appear here.\n\n" +
		styles.Footer.Render("1 Dashboard  q Quit")
}

// renderProgress creates a progress bar string
func renderProgress(percent int) string {
	width := 8
	filled := width * percent / 100
	empty := width - filled
	
	bar := ""
	for i := 0; i < filled; i++ {
		bar += "█"
	}
	for i := 0; i < empty; i++ {
		bar += "░"
	}
	return bar
}
