"use client";

import { motion } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc-client";
import { Mail, UserCircle2 } from "lucide-react";

export default function UsersPage() {
    const { data: session } = useSession();
    const { data: users = [], isLoading } = trpc.users.getAll.useQuery(undefined, {
        enabled: !!session,
    });

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold text-white mb-1">People</h1>
                <p className="text-white/40 text-sm">
                    Everyone who has created an account on MeetYou.
                </p>
            </motion.div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 rounded-full border-2 border-[#035efc] border-t-transparent animate-spin" />
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-20 text-white/30">
                    <UserCircle2 size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No other users yet.</p>
                </div>
            ) : (
                <motion.ul
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.05 } },
                    }}
                    className="grid sm:grid-cols-2 gap-4"
                >
                    {users.map((u) => (
                        <motion.li
                            key={u.id}
                            variants={{
                                hidden: { opacity: 0, y: 12 },
                                visible: { opacity: 1, y: 0 },
                            }}
                            className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex items-center gap-4"
                        >
                            <div className="w-12 h-12 rounded-full bg-[#035efc]/20 border border-[#035efc]/30 flex items-center justify-center text-lg font-bold text-[#035efc] shrink-0">
                                {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-white truncate">{u.name}</p>
                                <p className="flex items-center gap-1 text-xs text-white/40 truncate mt-0.5">
                                    <Mail size={11} /> {u.email}
                                </p>
                                <p className="text-[10px] text-white/20 mt-1">
                                    Joined {new Date(u.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </motion.li>
                    ))}
                </motion.ul>
            )}
        </div>
    );
}