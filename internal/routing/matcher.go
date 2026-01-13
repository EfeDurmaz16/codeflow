package routing

import (
	"strings"

	"github.com/codeflow/orchestrator/internal/parser"
)

// Matcher implements intelligent agent selection logic
type Matcher struct {
}

// NewMatcher creates a new Matcher instance
func NewMatcher() *Matcher {
	return &Matcher{}
}

// CalculateScore returns a suitability score for an agent given a task
// Higher score means better match.
func (m *Matcher) CalculateScore(agent parser.AgentConfig, task parser.TaskConfig) int {
	score := 0
	reqs := task.Requirements
	caps := agent.Capabilities

	// 1. Language Match (+10 per match)
	for _, reqLang := range reqs.Languages {
		for _, agLang := range caps.Languages {
			if strings.EqualFold(reqLang, agLang) {
				score += 10
			}
		}
	}

	// 2. Framework Match (+15 per match - slightly higher weight)
	for _, reqFw := range reqs.Frameworks {
		for _, agFw := range caps.Frameworks {
			if strings.EqualFold(reqFw, agFw) {
				score += 15
			}
		}
	}

	// 3. Tool Match (+5 per match)
	for _, reqTool := range reqs.Tools {
		for _, agTool := range caps.Tools {
			if strings.EqualFold(reqTool, agTool) {
				score += 5
			}
		}
	}

	// 4. Role Match (+5)
	// If task doesn't specify role, ignored.
	// We don't have Role in Task Requirements yet, maybe use Metadata?
	// For now, skip.

	// 5. Skill Level Check
	// If agent is Expert but task is Junior: perfect match (+5)
	// If agent is Junior but task is Expert: penalty (-20)
	if reqs.SkillLevel != "" {
		agentLevel := getSkillValue(agent.TaskAssignment.SkillLevel)
		reqLevel := getSkillValue(reqs.SkillLevel)

		if agentLevel >= reqLevel {
			score += 5
		} else {
			score -= 20
		}
	}

	return score
}

func getSkillValue(level string) int {
	switch strings.ToLower(level) {
	case "expert":
		return 3
	case "senior":
		return 2
	case "junior":
		return 1
	default:
		return 1 // Assume Junior if unknown
	}
}
