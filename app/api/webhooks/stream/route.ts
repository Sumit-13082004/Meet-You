import { NextRequest, NextResponse } from "next/server";
import { getStreamClient } from "@/lib/stream";
import { db } from "@/lib/db";
import { meetings } from "@/lib/schema";
import { eq } from "drizzle-orm";

/**
 * Stream sends a POST here for every call lifecycle event.
 * We handle `call.missed` to mark the meeting as missed in our DB.
 *
 * Setup in Stream dashboard:
 *   Webhook URL → https://your-domain.com/api/webhooks/stream
 *   Events to enable → call.ended, call.missed, call.rejected
 */
export async function POST(req: NextRequest) {
    // ── 1. Verify Stream signature ────────────────────────────────────────────
    const signature = req.headers.get("x-webhook-signature") ?? "";
    const rawBody = await req.text();

    const streamClient = getStreamClient();
    const isValid = streamClient.verifyWebhook(rawBody, signature);

    if (!isValid) {
        console.error("[stream-webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // ── 2. Parse event ────────────────────────────────────────────────────────
    let event: Record<string, unknown>;
    try {
        event = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
    }

    const type = event.type as string | undefined;
    const callId = (event.call as Record<string, unknown> | undefined)?.id as string | undefined;

    if (!callId) {
        return NextResponse.json({ ok: true }); // nothing to do
    }

    // ── 3. Handle specific events ─────────────────────────────────────────────
    try {
        switch (type) {
            // Nobody answered before the ring timeout
            case "call.missed": {
                await db
                    .update(meetings)
                    .set({ status: "missed" })
                    .where(eq(meetings.id, callId));

                console.log(`[stream-webhook] Meeting ${callId} → missed`);
                break;
            }

            // Call ended normally (both sides hung up / host ended)
            case "call.ended": {
                await db
                    .update(meetings)
                    .set({ status: "ended", endedAt: new Date() })
                    .where(eq(meetings.id, callId));

                console.log(`[stream-webhook] Meeting ${callId} → ended`);
                break;
            }

            // Invitee explicitly rejected
            case "call.rejected": {
                await db
                    .update(meetings)
                    .set({ status: "declined" })
                    .where(eq(meetings.id, callId));

                console.log(`[stream-webhook] Meeting ${callId} → declined`);
                break;
            }

            default:
                // Ignore all other event types
                break;
        }
    } catch (err) {
        console.error("[stream-webhook] DB update failed", err);
        // Return 200 so Stream doesn't keep retrying on our DB hiccup
    }

    return NextResponse.json({ ok: true });
}