import { router } from "../trpc";
import { agentsRouter } from "./agents";
import { tasksRouter } from "./tasks";
import { workflowsRouter } from "./workflows";
import { settingsRouter } from "./settings";

export const appRouter = router({
  agents: agentsRouter,
  tasks: tasksRouter,
  workflows: workflowsRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
