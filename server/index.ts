import { createTRPCRouter } from "@/server/trpc";
import { meetingsRouter } from "@/server/routers/meetings";
import { usersRouter } from "@/server/routers/users";

export const appRouter = createTRPCRouter({
    meetings: meetingsRouter,
    users: usersRouter,
});

export type AppRouter = typeof appRouter;