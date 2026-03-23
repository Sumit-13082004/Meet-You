import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { user } from "@/lib/schema";
import { ne } from "drizzle-orm";

export const usersRouter = createTRPCRouter({
    /** All users except the currently logged-in one */
    getAll: protectedProcedure.query(async ({ ctx }) => {
        const users = await ctx.db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                createdAt: user.createdAt,
            })
            .from(user)
            .where(ne(user.id, ctx.userId));

        return users;
    }),
});