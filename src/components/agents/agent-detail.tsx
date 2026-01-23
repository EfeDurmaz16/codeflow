"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Cpu,
  HardDrive,
  Zap,
  DollarSign,
  Clock,
  Play,
  Pause,
  RefreshCw,
  Settings,
} from "lucide-react";
import type { Agent, AgentLog, AgentStatus, Task } from "@/types";

interface AgentDetailProps {
  agent: Agent;
  logs?: AgentLog[];
  tasks?: Task[];
}

const statusColors: Record<AgentStatus, string> = {
  online: "bg-green-500",
  offline: "bg-zinc-500",
  busy: "bg-yellow-500",
  error: "bg-red-500",
};

const agentTypeLabels: Record<string, string> = {
  cursor: "Cursor",
  windsurf: "Windsurf",
  claude_code: "Claude Code",
  codex: "Codex",
  gemini: "Gemini CLI",
  aider: "Aider",
  custom: "Custom",
};

const logLevelColors: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  debug: "text-zinc-400",
};

export function AgentDetail({ agent, logs = [], tasks = [] }: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
            <Bot className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <Badge variant="secondary">
                {agentTypeLabels[agent.type] || agent.type}
              </Badge>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    statusColors[agent.status]
                  )}
                />
                <span className="text-sm capitalize text-muted-foreground">
                  {agent.status}
                </span>
              </div>
            </div>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {agent.endpoint}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Ping
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
          {agent.status === "online" ? (
            <Button variant="outline" size="sm">
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          ) : (
            <Button size="sm">
              <Play className="mr-2 h-4 w-4" />
              Start
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Cpu className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{agent.metrics.cpu.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">CPU Usage</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <HardDrive className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{agent.metrics.memory.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Memory Usage</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {(agent.metrics.tokensUsed / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-muted-foreground">Tokens Used</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">${agent.metrics.cost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Cost</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{agent.metrics.latencyMs}ms</p>
              <p className="text-xs text-muted-foreground">Latency</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="tasks">Task History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                {agent.capabilities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No capabilities configured
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((cap) => (
                      <Badge key={cap} variant="secondary">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">
                    {formatDistanceToNow(new Date(agent.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="text-sm">
                    {formatDistanceToNow(new Date(agent.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {agent.lastPingAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Ping</span>
                    <span className="text-sm">
                      {formatDistanceToNow(new Date(agent.lastPingAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Logs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {logs.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    No logs available
                  </p>
                ) : (
                  <div className="font-mono text-xs">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex gap-3 border-b border-border px-4 py-2 last:border-0"
                      >
                        <span className="text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                        <span
                          className={cn(
                            "uppercase",
                            logLevelColors[log.level]
                          )}
                        >
                          [{log.level}]
                        </span>
                        <span className="flex-1">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Task History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {tasks.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    No task history
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {task.status}
                          </p>
                        </div>
                        <Badge
                          variant={
                            task.status === "completed"
                              ? "default"
                              : task.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
