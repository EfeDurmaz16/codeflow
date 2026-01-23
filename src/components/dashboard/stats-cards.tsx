"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, ListTodo, GitBranch, Activity } from "lucide-react";

interface StatsCardsProps {
  stats: {
    totalAgents: number;
    onlineAgents: number;
    totalTasks: number;
    runningTasks: number;
    activeWorkflows: number;
    totalCost: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Agents",
      value: `${stats.onlineAgents}/${stats.totalAgents}`,
      subtitle: "Online",
      icon: Bot,
      color: "text-green-500",
    },
    {
      title: "Tasks",
      value: stats.runningTasks.toString(),
      subtitle: `of ${stats.totalTasks} running`,
      icon: ListTodo,
      color: "text-primary",
    },
    {
      title: "Workflows",
      value: stats.activeWorkflows.toString(),
      subtitle: "Active",
      icon: GitBranch,
      color: "text-purple-500",
    },
    {
      title: "Total Cost",
      value: `$${stats.totalCost.toFixed(2)}`,
      subtitle: "This session",
      icon: Activity,
      color: "text-yellow-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
