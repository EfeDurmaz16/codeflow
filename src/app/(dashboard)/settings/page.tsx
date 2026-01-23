"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Key, Bot, GitBranch, Bell, Save, Eye, EyeOff } from "lucide-react";

interface ApiKeyFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function ApiKeyField({ label, value, onChange, placeholder }: ApiKeyFieldProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type={showKey ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowKey(!showKey)}
        >
          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState({
    openai: "",
    anthropic: "",
    gemini: "",
    github: "",
  });

  const [agentSettings, setAgentSettings] = useState({
    defaultAssignment: "capability-based",
    autoRetry: true,
    maxRetries: 3,
    timeoutSeconds: 300,
  });

  const [notifications, setNotifications] = useState({
    taskCompleted: true,
    taskFailed: true,
    agentOffline: true,
    workflowCompleted: true,
  });

  return (
    <div className="flex flex-col">
      <Header
        title="Settings"
        description="Configure your CodeFlow instance"
      />

      <div className="flex-1 p-6">
        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList>
            <TabsTrigger value="api-keys">
              <Key className="mr-2 h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="agents">
              <Bot className="mr-2 h-4 w-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <GitBranch className="mr-2 h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Configure API keys for different AI providers. Keys are encrypted at rest.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ApiKeyField
                  label="OpenAI API Key"
                  value={apiKeys.openai}
                  onChange={(value) => setApiKeys({ ...apiKeys, openai: value })}
                  placeholder="sk-..."
                />
                <Separator />
                <ApiKeyField
                  label="Anthropic API Key"
                  value={apiKeys.anthropic}
                  onChange={(value) => setApiKeys({ ...apiKeys, anthropic: value })}
                  placeholder="sk-ant-..."
                />
                <Separator />
                <ApiKeyField
                  label="Google AI (Gemini) API Key"
                  value={apiKeys.gemini}
                  onChange={(value) => setApiKeys({ ...apiKeys, gemini: value })}
                  placeholder="AIza..."
                />
                <Separator />
                <ApiKeyField
                  label="GitHub Personal Access Token"
                  value={apiKeys.github}
                  onChange={(value) => setApiKeys({ ...apiKeys, github: value })}
                  placeholder="ghp_..."
                />
                <div className="flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Save API Keys
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <CardTitle>Agent Configuration</CardTitle>
                <CardDescription>
                  Default settings for agent behavior and task assignment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Default Assignment Method</Label>
                  <Select
                    value={agentSettings.defaultAssignment}
                    onValueChange={(value) =>
                      setAgentSettings({ ...agentSettings, defaultAssignment: value })
                    }
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="round-robin">Round Robin</SelectItem>
                      <SelectItem value="capability-based">Capability Based</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    How tasks are assigned to agents by default
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Retry Failed Tasks</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically retry tasks that fail
                    </p>
                  </div>
                  <Switch
                    checked={agentSettings.autoRetry}
                    onCheckedChange={(checked) =>
                      setAgentSettings({ ...agentSettings, autoRetry: checked })
                    }
                  />
                </div>

                {agentSettings.autoRetry && (
                  <div className="space-y-2 pl-4 border-l-2 border-border">
                    <Label>Max Retries</Label>
                    <Input
                      type="number"
                      value={agentSettings.maxRetries}
                      onChange={(e) =>
                        setAgentSettings({
                          ...agentSettings,
                          maxRetries: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-24"
                      min={1}
                      max={10}
                    />
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label>Task Timeout (seconds)</Label>
                  <Input
                    type="number"
                    value={agentSettings.timeoutSeconds}
                    onChange={(e) =>
                      setAgentSettings({
                        ...agentSettings,
                        timeoutSeconds: parseInt(e.target.value) || 300,
                      })
                    }
                    className="w-32"
                    min={60}
                    max={3600}
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum time a task can run before timing out
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>GitHub</CardTitle>
                      <CardDescription>
                        Connect to GitHub for repository access and PR creation
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Connected</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-create branches</p>
                      <p className="text-sm text-muted-foreground">
                        Create feature branches for each task
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-commit changes</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically commit changes made by agents
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Create pull requests</p>
                      <p className="text-sm text-muted-foreground">
                        Open PRs when tasks are completed
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Database</CardTitle>
                      <CardDescription>PostgreSQL connection status</CardDescription>
                    </div>
                    <Badge className="bg-green-500">Connected</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Host:</span>
                      <span>localhost:5432</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Database:</span>
                      <span>codeflow</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pool Size:</span>
                      <span>10 connections</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose which events trigger notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Task Completed</p>
                    <p className="text-sm text-muted-foreground">
                      When a task finishes successfully
                    </p>
                  </div>
                  <Switch
                    checked={notifications.taskCompleted}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, taskCompleted: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Task Failed</p>
                    <p className="text-sm text-muted-foreground">
                      When a task fails or encounters an error
                    </p>
                  </div>
                  <Switch
                    checked={notifications.taskFailed}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, taskFailed: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Agent Offline</p>
                    <p className="text-sm text-muted-foreground">
                      When an agent goes offline unexpectedly
                    </p>
                  </div>
                  <Switch
                    checked={notifications.agentOffline}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, agentOffline: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Workflow Completed</p>
                    <p className="text-sm text-muted-foreground">
                      When a workflow run finishes
                    </p>
                  </div>
                  <Switch
                    checked={notifications.workflowCompleted}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, workflowCompleted: checked })
                    }
                  />
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
