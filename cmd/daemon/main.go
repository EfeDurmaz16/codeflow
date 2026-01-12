// Package main is the entry point for the CodeFlow Orchestrator Daemon.
// The daemon is responsible for coordinating multiple AI agents,
// managing tasks, and synchronizing file changes across the codebase.
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/codeflow/orchestrator/internal/config"
	"github.com/codeflow/orchestrator/internal/orchestrator"
)

// Version and BuildTime are set at build time via ldflags
var (
	Version   = "dev"
	BuildTime = "unknown"
)

func main() {
	// Print banner
	printBanner()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize orchestrator
	orch, err := orchestrator.New(cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to initialize orchestrator: %v\n", err)
		os.Exit(1)
	}

	// Start orchestrator
	fmt.Println("🚀 Starting CodeFlow Daemon...")
	
	if err := orch.Start(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to start orchestrator: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("  ✓ Orchestrator started")

	// Start HTTP API server
	apiServer := startAPIServer(cfg.APIPort, orch)
	fmt.Printf("  ✓ API server started on port %d\n", cfg.APIPort)

	fmt.Println()
	fmt.Println("✅ CodeFlow Daemon is running")
	fmt.Printf("   Version: %s (built %s)\n", Version, BuildTime)
	fmt.Printf("   Mode:    %s\n", cfg.Mode)
	fmt.Printf("   API:     http://localhost:%d\n", cfg.APIPort)
	fmt.Println()

	// Print stats
	stats := orch.GetStats()
	fmt.Printf("   Tasks:   %d active, %d completed\n", stats["active_tasks"], stats["completed_tasks"])
	fmt.Printf("   Agents:  %d connected\n", stats["connected_agents"])
	fmt.Println()
	fmt.Println("Press Ctrl+C to stop...")

	// Wait for shutdown signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	fmt.Println()
	fmt.Println("🛑 Shutting down gracefully...")

	// Cancel context to stop all components
	cancel()

	// Give components time to clean up
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	// Stop API server
	if err := apiServer.Shutdown(shutdownCtx); err != nil {
		fmt.Fprintf(os.Stderr, "⚠️  API server stop error: %v\n", err)
	}

	// Stop orchestrator
	if err := orch.Stop(shutdownCtx); err != nil {
		fmt.Fprintf(os.Stderr, "⚠️  Orchestrator stop error: %v\n", err)
	}

	fmt.Println("👋 CodeFlow Daemon stopped")
}

func startAPIServer(port int, orch *orchestrator.Orchestrator) *http.Server {
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"healthy"}`))
	})

	// Stats endpoint
	mux.HandleFunc("/stats", func(w http.ResponseWriter, r *http.Request) {
		stats := orch.GetStats()
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"active_tasks":%d,"completed_tasks":%d,"connected_agents":%d}`,
			stats["active_tasks"], stats["completed_tasks"], stats["connected_agents"])
	})

	// Tasks endpoint
	mux.HandleFunc("/tasks", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			tasks := orch.ListTasks("")
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"tasks":[`))
			for i, t := range tasks {
				if i > 0 {
					w.Write([]byte(","))
				}
				fmt.Fprintf(w, `{"id":"%s","name":"%s","status":"%s"}`,
					t.Config.ID, t.Config.Name, t.Status)
			}
			w.Write([]byte("]}"))
		}
	})

	// Agents endpoint
	mux.HandleFunc("/agents", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			agents := orch.ListAgents()
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"agents":[`))
			for i, a := range agents {
				if i > 0 {
					w.Write([]byte(","))
				}
				fmt.Fprintf(w, `{"id":"%s","status":"%s","provider":"%s"}`,
					a.Config.ID, a.GetStatus(), a.Config.Provider)
			}
			w.Write([]byte("]}"))
		}
	})

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: mux,
	}

	go func() {
		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			fmt.Fprintf(os.Stderr, "API server error: %v\n", err)
		}
	}()

	return server
}

func printBanner() {
	banner := `
 ██████╗ ██████╗ ██████╗ ███████╗███████╗██╗      ██████╗ ██╗    ██╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝██║     ██╔═══██╗██║    ██║
██║     ██║   ██║██║  ██║█████╗  █████╗  ██║     ██║   ██║██║ █╗ ██║
██║     ██║   ██║██║  ██║██╔══╝  ██╔══╝  ██║     ██║   ██║██║███╗██║
╚██████╗╚██████╔╝██████╔╝███████╗██║     ███████╗╚██████╔╝╚███╔███╔╝
 ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝ 
                    Agent Orchestrator Daemon
`
	fmt.Println(banner)
}
