import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const settingsRouter = router({
  // Get all settings
  list: publicProcedure.query(async ({ ctx }) => {
    const settings = await ctx.prisma.setting.findMany({
      orderBy: { key: "asc" },
    });

    // Mask encrypted values
    return settings.map((s) => ({
      ...s,
      value: s.encrypted ? "********" : s.value,
    }));
  }),

  // Get single setting by key
  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const setting = await ctx.prisma.setting.findUnique({
        where: { key: input.key },
      });

      if (!setting) {
        return null;
      }

      // Mask encrypted values
      return {
        ...setting,
        value: setting.encrypted ? "********" : setting.value,
      };
    }),

  // Get raw value (for internal use)
  getValue: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const setting = await ctx.prisma.setting.findUnique({
        where: { key: input.key },
      });

      return setting?.value || null;
    }),

  // Set setting value
  set: publicProcedure
    .input(
      z.object({
        key: z.string().min(1).max(100),
        value: z.string(),
        encrypted: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const setting = await ctx.prisma.setting.upsert({
        where: { key: input.key },
        create: {
          key: input.key,
          value: input.value,
          encrypted: input.encrypted,
        },
        update: {
          value: input.value,
          encrypted: input.encrypted,
        },
      });

      return {
        ...setting,
        value: setting.encrypted ? "********" : setting.value,
      };
    }),

  // Delete setting
  delete: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.setting.delete({
        where: { key: input.key },
      });

      return { success: true };
    }),

  // Bulk update settings
  bulkSet: publicProcedure
    .input(
      z.array(
        z.object({
          key: z.string().min(1).max(100),
          value: z.string(),
          encrypted: z.boolean().default(false),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.map((setting) =>
          ctx.prisma.setting.upsert({
            where: { key: setting.key },
            create: setting,
            update: {
              value: setting.value,
              encrypted: setting.encrypted,
            },
          })
        )
      );

      return results.map((s) => ({
        ...s,
        value: s.encrypted ? "********" : s.value,
      }));
    }),
});
