"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Agent, AgentStatus } from "@/types";
import { Bot, Cpu, HardDrive, Zap, DollarSign } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
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

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.id}`}>
      <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Bot className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">
                  {agent.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {agentTypeLabels[agent.type] || agent.type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn("h-2 w-2 rounded-full", statusColors[agent.status])}
              />
              <span className="text-xs capitalize text-muted-foreground">
                {agent.status}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {agent.metrics.cpu.toFixed(0)}% CPU
              </span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {agent.metrics.memory.toFixed(0)}% RAM
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {(agent.metrics.tokensUsed / 1000).toFixed(1)}k tokens
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                ${agent.metrics.cost.toFixed(2)}
              </span>
            </div>
          </div>

          {agent.capabilities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {agent.capabilities.slice(0, 3).map((cap) => (
                <Badge key={cap} variant="secondary" className="text-[10px]">
                  {cap}
                </Badge>
              ))}
              {agent.capabilities.length > 3 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{agent.capabilities.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
