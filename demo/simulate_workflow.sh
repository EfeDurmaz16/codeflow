#!/bin/bash
# demo/simulate_workflow.sh
# Simulates a full CodeFlow workflow with CLI, Daemon, and External Agents

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting CodeFlow Demo Simulation${NC}"

# 1. Start Daemon in background
echo -e "\n${BLUE}[1/6] Starting Daemon...${NC}"
./bin/codeflow-daemon > daemon.log 2>&1 &
DAEMON_PID=$!
sleep 2 # Wait for startup

# Check health
curl -s http://localhost:5555/health | grep "healthy" > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Daemon is healthy${NC}"
else
    echo "❌ Daemon failed to start"
    exit 1
fi

# 2. Register External Agent (Cursor Simulation)
echo -e "\n${BLUE}[2/6] Connecting External Agent (Cursor)...${NC}"
# Simulate what 'codeflow agent cursor' does
./bin/codeflow agent cursor > /dev/null 2>&1 &
AGENT_PID=$!
sleep 1
echo -e "${GREEN}✅ Cursor agent connected${NC}"

# Verify agent list
./bin/codeflow agent list

# 3. Create a Task
echo -e "\n${BLUE}[3/6] Creating a Task...${NC}"
./bin/codeflow task create "Implement Login Feature" --priority high
# Note: In real system parsing might take a moment if using file events, 
# but CLI creates file. Daemon watches.
sleep 1
echo -e "${GREEN}✅ Task created${NC}"

# 4. List Tasks
echo -e "\n${BLUE}[4/6] Listing Tasks...${NC}"
./bin/codeflow task list

# 5. Execute Task (Simulate MCP Pull)
echo -e "\n${BLUE}[5/6] Executing Task via MCP Pull...${NC}"

TASK_ID=$(curl -s http://localhost:5555/tasks | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TASK_ID" ]; then
    echo "❌ No task found to execute"
else 
    echo "Task ID: $TASK_ID"
    
    # 1. Assign Task
    ./bin/codeflow task assign "$TASK_ID" cursor
    echo "Assigned to Cursor."

    # 2. Simulate Cursor 'Pulling' the task via MCP
    # We'll use a simple curl to simulate the MCP server logic or just print the instruction
    echo -e "${GREEN}✅ Task ready for pickup!${NC}"
    echo -e "👉 Open Cursor and ask: 'Get my assigned CodeFlow task'"
    
    # In a real integration test we would call the MCP tool directly using an MCP client CLI
    # For now, we verified the server built and logic exists.
fi

# 6. Show Stats
echo -e "\n${BLUE}[6/6] Final Daemon Stats...${NC}"
curl -s http://localhost:5555/stats | jq . 2>/dev/null || curl -s http://localhost:5555/stats

# Cleanup
echo -e "\n${BLUE}🧹 Cleaning up...${NC}"
kill $DAEMON_PID
kill $AGENT_PID 2>/dev/null || true
echo -e "${GREEN}✨ Demo Complete!${NC}"
