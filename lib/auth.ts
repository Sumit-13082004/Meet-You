import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema, // explicitly pass our schema so better-auth finds the tables
    }),
    emailAndPassword: {
        enabled: true,
    },
    // Social providers disabled until OAuth credentials are added
    // socialProviders: { google: {...}, github: {...} }
});