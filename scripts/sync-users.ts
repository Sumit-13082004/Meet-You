import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

(async () => {
    const { db } = await import("@/lib/db");
    const { user } = await import("@/lib/schema");
    const { syncUserToStream } = await import("@/lib/stream");
    try {
        const users = await db.select().from(user);

        for (const u of users) {
            await syncUserToStream({
                id: u.id,
                name: u.name,
                image: u.image,
            });

            console.log("synced", u.email);
        }

        console.log("✅ All users synced to Stream");
        process.exit(0);
    } catch (err) {
        console.error("❌ Sync failed:", err);
        process.exit(1);
    }
})();