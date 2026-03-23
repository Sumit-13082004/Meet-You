import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import superjson from "superjson";
import { headers } from "next/headers";

export const createTRPCContext = cache(async () => {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    return {
        db,
        session,
        userId: session?.user?.id ?? null,
    };
});

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
    transformer: superjson, // ← must match client transformer
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({ ctx: { ...ctx, userId: ctx.userId } });
});