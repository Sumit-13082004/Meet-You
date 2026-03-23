import { StreamClient } from "@stream-io/node-sdk";

let _client: StreamClient | null = null;

export function getStreamClient(): StreamClient {
    if (!_client) {
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
        const secret = process.env.STREAM_SECRET_KEY;

        if (!apiKey || !secret) {
            throw new Error("Missing NEXT_PUBLIC_STREAM_API_KEY or STREAM_SECRET_KEY");
        }

        _client = new StreamClient(apiKey, secret);
    }
    return _client;
}

/** Server-side token for a user (used by tRPC getStreamToken) */
export function generateStreamToken(userId: string): string {
    return getStreamClient().generateUserToken({ user_id: userId });
}

/** Sync a user to Stream — call on signup so they can receive rings */
export async function syncUserToStream(user: {
    id: string;
    name?: string | null;
    image?: string | null;
}): Promise<void> {
    const client = getStreamClient();
    await client.upsertUsers([
        {
            id: user.id,
            name: user.name ?? user.id,
            ...(user.image ? { image: user.image } : {}),
        },
    ]);
}