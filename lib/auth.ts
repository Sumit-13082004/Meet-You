import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { syncUserToStream } from "@/lib/stream";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),

    emailAndPassword: {
        enabled: true,
    },

    // ✅ databaseHooks — fires after every new user row is created in DB
    // Correct API: receives the user object directly, no middleware wrapper needed
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    try {
                        await syncUserToStream({
                            id: user.id,
                            name: user.name,
                            image: user.image,
                        });
                    } catch (err) {
                        // Non-fatal — never break the signup response
                        console.error("[auth] Stream sync failed:", err);
                    }
                },
            },
        },
    },

    // socialProviders: {
    //   google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! },
    //   github: { clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! },
    // },
});