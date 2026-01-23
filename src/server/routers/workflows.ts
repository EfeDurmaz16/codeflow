import { z } from "zod";
import { router, publicProcedure } from "../trpc";

// Validation schemas
const WorkflowStatusSchema = z.enum(["active", "paused", "draft"]);

const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["start", "end", "task", "condition", "parallel", "join"]),
  label: z.string(),
  taskTemplate: z.any().optional(),
  condition: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  connections: z.array(z.string()),
});

const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  graph: z.array(WorkflowNodeSchema).default([]),
  triggers: z.array(z.string()).default(["manual"]),
  category: z.string().optional(),
  isTemplate: z.boolean().default(false),
});

const UpdateWorkflowSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: WorkflowStatusSchema.optional(),
  graph: z.array(WorkflowNodeSchema).optional(),
  triggers: z.array(z.string()).optional(),
  category: z.string().optional(),
  isTemplate: z.boolean().optional(),
});

export const workflowsRouter = router({
  // List all workflows
  list: publicProcedure
    .input(
      z
        .object({
          status: WorkflowStatusSchema.optional(),
          category: z.string().optional(),
          isTemplate: z.boolean().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const {
        status,
        category,
        isTemplate,
        limit = 50,
        offset = 0,
      } = input || {};

      const where = {
        ...(status && { status }),
        ...(category && { category }),
        ...(isTemplate !== undefined && { isTemplate }),
      };

      const [workflows, total] = await Promise.all([
        ctx.prisma.workflow.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { updatedAt: "desc" },
          include: {
            _count: {
              select: { tasks: true, runs: true },
            },
          },
        }),
        ctx.prisma.workflow.count({ where }),
      ]);

      return { workflows, total };
    }),

  // Get single workflow by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await ctx.prisma.workflow.findUnique({
        where: { id: input.id },
        include: {
          tasks: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
          runs: {
            orderBy: { startedAt: "desc" },
            take: 10,
          },
        },
      });

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      return workflow;
    }),

  // Create new workflow
  create: publicProcedure
    .input(CreateWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.prisma.workflow.create({
        data: {
          name: input.name,
          description: input.description,
          graph: input.graph,
          triggers: input.triggers,
          category: input.category,
          isTemplate: input.isTemplate,
          status: "draft",
        },
      });

      return workflow;
    }),

  // Update workflow
  update: publicProcedure
    .input(UpdateWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const workflow = await ctx.prisma.workflow.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      return workflow;
    }),

  // Delete workflow
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.workflow.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Run workflow
  run: publicProcedure
    .input(
      z.object({
        id: z.string(),
        context: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.prisma.workflow.findUnique({
        where: { id: input.id },
      });

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      if (workflow.status !== "active") {
        throw new Error("Workflow is not active");
      }

      // Create workflow run
      const run = await ctx.prisma.workflowRun.create({
        data: {
          workflowId: input.id,
          status: "pending",
          context: input.context || {},
        },
      });

      // Update workflow last run time
      await ctx.prisma.workflow.update({
        where: { id: input.id },
        data: { lastRunAt: new Date() },
      });

      // In production, this would trigger the workflow execution engine
      // For now, we'll just return the run record

      return run;
    }),

  // Get workflow runs
  getRuns: publicProcedure
    .input(
      z.object({
        workflowId: z.string(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { workflowId, status, limit, offset } = input;

      const where = {
        workflowId,
        ...(status && { status }),
      };

      const [runs, total] = await Promise.all([
        ctx.prisma.workflowRun.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { startedAt: "desc" },
        }),
        ctx.prisma.workflowRun.count({ where }),
      ]);

      return { runs, total };
    }),

  // Get templates
  templates: publicProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where = {
        isTemplate: true,
        ...(input?.category && { category: input.category }),
      };

      const templates = await ctx.prisma.workflow.findMany({
        where,
        orderBy: { name: "asc" },
      });

      return templates;
    }),

  // Clone workflow (create from template)
  clone: publicProcedure
    .input(
      z.object({
        sourceId: z.string(),
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.prisma.workflow.findUnique({
        where: { id: input.sourceId },
      });

      if (!source) {
        throw new Error("Source workflow not found");
      }

      const workflow = await ctx.prisma.workflow.create({
        data: {
          name: input.name,
          description: source.description,
          graph: source.graph ?? [],
          triggers: source.triggers,
          category: source.category,
          isTemplate: false,
          status: "draft",
        },
      });

      return workflow;
    }),
});
