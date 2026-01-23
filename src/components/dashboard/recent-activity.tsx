"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, CheckCircle, XCircle, Play } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "task_completed" | "task_failed" | "agent_online" | "agent_offline" | "workflow_started";
  message: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const activityIcons = {
  task_completed: CheckCircle,
  task_failed: XCircle,
  agent_online: Bot,
  agent_offline: Bot,
  workflow_started: Play,
};

const activityColors = {
  task_completed: "text-green-500",
  task_failed: "text-red-500",
  agent_online: "text-green-500",
  agent_offline: "text-zinc-500",
  workflow_started: "text-primary",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-0">
            {activities.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No recent activity
              </p>
            ) : (
              activities.map((activity) => {
                const Icon = activityIcons[activity.type];
                const color = activityColors[activity.type];

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 border-b border-border px-6 py-3 last:border-0"
                  >
                    <Icon className={`mt-0.5 h-4 w-4 ${color}`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
