import { z } from "zod";
import { router, publicProcedure } from "../trpc";

// Validation schemas
const TaskStatusSchema = z.enum([
  "queued",
  "assigned",
  "running",
  "completed",
  "failed",
]);

const TaskPrioritySchema = z.enum(["critical", "high", "normal", "low"]);

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string(),
  priority: TaskPrioritySchema.default("normal"),
  parentTaskId: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  files: z.array(z.string()).default([]),
  workflowId: z.string().optional(),
  workflowNodeId: z.string().optional(),
});

const UpdateTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  output: z.string().optional(),
  errorMessage: z.string().optional(),
});

const AssignTaskSchema = z.object({
  taskId: z.string(),
  agentId: z.string(),
  method: z.enum(["manual", "round-robin", "capability-based"]).default("manual"),
});

export const tasksRouter = router({
  // List all tasks
  list: publicProcedure
    .input(
      z
        .object({
          status: TaskStatusSchema.optional(),
          priority: TaskPrioritySchema.optional(),
          assignedAgentId: z.string().optional(),
          workflowId: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const {
        status,
        priority,
        assignedAgentId,
        workflowId,
        limit = 50,
        offset = 0,
      } = input || {};

      const where = {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assignedAgentId && { assignedAgentId }),
        ...(workflowId && { workflowId }),
      };

      const [tasks, total] = await Promise.all([
        ctx.prisma.task.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
          include: {
            assignedAgent: {
              select: { id: true, name: true, type: true, status: true },
            },
            subtasks: {
              select: { id: true, title: true, status: true },
            },
            _count: {
              select: { subtasks: true, logs: true },
            },
          },
        }),
        ctx.prisma.task.count({ where }),
      ]);

      return { tasks, total };
    }),

  // Get single task by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        include: {
          assignedAgent: true,
          subtasks: true,
          parentTask: {
            select: { id: true, title: true },
          },
          dependsOn: {
            include: {
              dependency: {
                select: { id: true, title: true, status: true },
              },
            },
          },
          dependedBy: {
            include: {
              dependent: {
                select: { id: true, title: true, status: true },
              },
            },
          },
          logs: {
            take: 100,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      return task;
    }),

  // Create new task
  create: publicProcedure
    .input(CreateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { dependencies, ...data } = input;

      const task = await ctx.prisma.task.create({
        data: {
          ...data,
          status: "queued",
        },
      });

      // Create dependencies
      if (dependencies.length > 0) {
        await ctx.prisma.taskDependency.createMany({
          data: dependencies.map((depId) => ({
            dependentId: task.id,
            dependencyId: depId,
          })),
        });
      }

      return task;
    }),

  // Update task
  update: publicProcedure
    .input(UpdateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, status, ...data } = input;

      const updateData: Record<string, unknown> = { ...data };

      // Handle status transitions
      if (status) {
        updateData.status = status;
        if (status === "running" && !data.output) {
          updateData.startedAt = new Date();
        }
        if (status === "completed" || status === "failed") {
          updateData.completedAt = new Date();
        }
      }

      const task = await ctx.prisma.task.update({
        where: { id },
        data: updateData,
      });

      return task;
    }),

  // Delete task
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.task.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Assign task to agent
  assign: publicProcedure
    .input(AssignTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { taskId, agentId, method } = input;

      // Check if agent exists and is available
      const agent = await ctx.prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new Error("Agent not found");
      }

      if (agent.status !== "online") {
        throw new Error("Agent is not available");
      }

      // Update task assignment
      const task = await ctx.prisma.task.update({
        where: { id: taskId },
        data: {
          assignedAgentId: agentId,
          assignmentMethod: method,
          status: "assigned",
        },
      });

      // Update agent's current task
      await ctx.prisma.agent.update({
        where: { id: agentId },
        data: {
          currentTaskId: taskId,
          status: "busy",
        },
      });

      return task;
    }),

  // Unassign task from agent
  unassign: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      // Update agent if task was assigned
      if (task.assignedAgentId) {
        await ctx.prisma.agent.update({
          where: { id: task.assignedAgentId },
          data: {
            currentTaskId: null,
            status: "online",
          },
        });
      }

      // Update task
      const updatedTask = await ctx.prisma.task.update({
        where: { id: input.taskId },
        data: {
          assignedAgentId: null,
          assignmentMethod: null,
          status: "queued",
        },
      });

      return updatedTask;
    }),

  // Get task logs
  getLogs: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        level: z.enum(["info", "warn", "error", "debug"]).optional(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { taskId, level, limit, offset } = input;

      const where = {
        taskId,
        ...(level && { level }),
      };

      const [logs, total] = await Promise.all([
        ctx.prisma.taskLog.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.taskLog.count({ where }),
      ]);

      return { logs, total };
    }),

  // Add task log
  addLog: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        level: z.enum(["info", "warn", "error", "debug"]),
        message: z.string(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.prisma.taskLog.create({
        data: {
          taskId: input.taskId,
          level: input.level,
          message: input.message,
          metadata: input.metadata ?? undefined,
        },
      });

      return log;
    }),

  // Get tasks by status (for Kanban view)
  byStatus: publicProcedure.query(async ({ ctx }) => {
    const tasks = await ctx.prisma.task.findMany({
      include: {
        assignedAgent: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    // Group by status
    const grouped = {
      queued: tasks.filter((t) => t.status === "queued"),
      assigned: tasks.filter((t) => t.status === "assigned"),
      running: tasks.filter((t) => t.status === "running"),
      completed: tasks.filter((t) => t.status === "completed"),
      failed: tasks.filter((t) => t.status === "failed"),
    };

    return grouped;
  }),
});
