// Package tui provides styling for the CodeFlow TUI.
package tui

import "github.com/charmbracelet/lipgloss"

// Color palette
const (
	colorPrimary    = "#32B8C6" // Teal
	colorSecondary  = "#5E5240" // Brown
	colorSuccess    = "#22C55E" // Green
	colorWarning    = "#F59E61" // Orange
	colorError      = "#FF5459" // Red
	colorBackground = "#1F2121" // Dark
	colorText       = "#F5F5F5" // Light
	colorSubtle     = "#6B7280" // Gray
)

// Styles holds all the TUI styles
type Styles struct {
	Primary   string
	Secondary string
	Success   lipgloss.Style
	Warning   lipgloss.Style
	Error     lipgloss.Style
	Text      string
	Subtle    lipgloss.Style
	Bold      lipgloss.Style

	Header       lipgloss.Style
	Footer       lipgloss.Style
	SectionTitle lipgloss.Style
	StatusBadge  lipgloss.Style
	Box          lipgloss.Style
}

var styles = Styles{
	Primary:   colorPrimary,
	Secondary: colorSecondary,
	Text:      colorText,

	Success: lipgloss.NewStyle().
		Foreground(lipgloss.Color(colorSuccess)),

	Warning: lipgloss.NewStyle().
		Foreground(lipgloss.Color(colorWarning)),

	Error: lipgloss.NewStyle().
		Foreground(lipgloss.Color(colorError)),

	Subtle: lipgloss.NewStyle().
		Foreground(lipgloss.Color(colorSubtle)),

	Bold: lipgloss.NewStyle().
		Bold(true),

	Header: lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color(colorPrimary)).
		MarginLeft(1).
		MarginBottom(1),

	Footer: lipgloss.NewStyle().
		Foreground(lipgloss.Color(colorSubtle)).
		MarginTop(1).
		MarginLeft(1),

	SectionTitle: lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color(colorText)).
		MarginLeft(1).
		MarginTop(1),

	StatusBadge: lipgloss.NewStyle().
		Foreground(lipgloss.Color(colorSuccess)).
		Background(lipgloss.Color("#1a3d1f")).
		Padding(0, 1).
		MarginLeft(2),

	Box: lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(colorSubtle)).
		Padding(1, 2),
}

// GradientText creates a gradient text effect (simplified)
func GradientText(text string, from, to string) string {
	return lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color(from)).
		Render(text)
}

// SuccessText renders success styled text
func SuccessText(text string) string {
	return styles.Success.Render(text)
}

// WarningText renders warning styled text
func WarningText(text string) string {
	return styles.Warning.Render(text)
}

// ErrorText renders error styled text
func ErrorText(text string) string {
	return styles.Error.Render(text)
}

// SubtleText renders subtle/muted text
func SubtleText(text string) string {
	return styles.Subtle.Render(text)
}
