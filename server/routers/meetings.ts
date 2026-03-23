import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { meetings, user } from "@/lib/schema";
import { eq, or, desc } from "drizzle-orm";
import { generateStreamToken } from "@/lib/stream";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";

export const meetingsRouter = createTRPCRouter({

    /** Create a new meeting (caller = host, picks invitee) */
    create: protectedProcedure
        .input(z.object({ inviteeId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const meetingId = randomUUID();

            await ctx.db.insert(meetings).values({
                id: meetingId,
                hostId: ctx.userId,
                inviteeId: input.inviteeId,
                status: "calling",
            });

            return { meetingId };
        }),

    /** Update meeting status */
    updateStatus: protectedProcedure
        .input(
            z.object({
                meetingId: z.string(),
                status: z.enum(["active", "ended", "declined", "missed"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const updateData: Record<string, unknown> = { status: input.status };

            if (input.status === "active") {
                updateData.startedAt = new Date();
            } else if (input.status === "ended") {
                updateData.endedAt = new Date();
            }

            await ctx.db
                .update(meetings)
                .set(updateData)
                .where(eq(meetings.id, input.meetingId));

            return { success: true };
        }),

    /** Get meeting by id (for meeting room page) */
    getById: protectedProcedure
        .input(z.object({ meetingId: z.string() }))
        .query(async ({ ctx, input }) => {
            const [meeting] = await ctx.db
                .select()
                .from(meetings)
                .where(eq(meetings.id, input.meetingId));

            if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });

            // Only host or invitee may access
            if (
                meeting.hostId !== ctx.userId &&
                meeting.inviteeId !== ctx.userId
            ) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            return meeting;
        }),

    /** Get past meetings for current user */
    getHistory: protectedProcedure.query(async ({ ctx }) => {
        const rows = await ctx.db
            .select({
                id: meetings.id,
                status: meetings.status,
                startedAt: meetings.startedAt,
                endedAt: meetings.endedAt,
                createdAt: meetings.createdAt,
                hostId: meetings.hostId,
                inviteeId: meetings.inviteeId,
                hostName: user.name,
            })
            .from(meetings)
            .leftJoin(user, eq(meetings.hostId, user.id))
            .where(
                or(
                    eq(meetings.hostId, ctx.userId),
                    eq(meetings.inviteeId, ctx.userId)
                )
            )
            .orderBy(desc(meetings.createdAt))
            .limit(50);

        return rows;
    }),

    /** Get pending incoming calls for current user */
    getPendingInvites: protectedProcedure.query(async ({ ctx }) => {
        const rows = await ctx.db
            .select({
                id: meetings.id,
                status: meetings.status,
                createdAt: meetings.createdAt,
                hostId: meetings.hostId,
                hostName: user.name,
                hostEmail: user.email,
            })
            .from(meetings)
            .leftJoin(user, eq(meetings.hostId, user.id))
            .where(eq(meetings.inviteeId, ctx.userId))
            .orderBy(desc(meetings.createdAt));

        return rows.filter((r) => r.status === "calling");
    }),

    /** Get a fresh Stream token for current user */
    getStreamToken: protectedProcedure.query(async ({ ctx }) => {
        const token = generateStreamToken(ctx.userId);
        return { token };
    }),
});