"use client";

import { motion } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc-client";
import { Clock, PhoneOff, PhoneMissed, PhoneCall } from "lucide-react";

const STATUS_CONFIG = {
    ended: { label: "Completed", color: "text-green-400", bg: "bg-green-400/10", icon: Clock },
    active: { label: "Active", color: "text-blue-400", bg: "bg-blue-400/10", icon: PhoneCall },
    missed: { label: "Missed", color: "text-red-400", bg: "bg-red-400/10", icon: PhoneMissed },
    declined: { label: "Declined", color: "text-yellow-400", bg: "bg-yellow-400/10", icon: PhoneOff },
    calling: { label: "Calling", color: "text-white/40", bg: "bg-white/5", icon: PhoneCall },
};

function duration(start?: Date | null, end?: Date | null): string {
    if (!start || !end) return "—";
    const secs = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function MeetingsPage() {
    const { data: session } = useSession();
    const { data: history = [], isLoading } = trpc.meetings.getHistory.useQuery(
        undefined,
        { enabled: !!session }
    );

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold text-white mb-1">Past Meetings</h1>
                <p className="text-white/40 text-sm">Your complete meeting history.</p>
            </motion.div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 rounded-full border-2 border-[#035efc] border-t-transparent animate-spin" />
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-20 text-white/30">
                    <Clock size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No meetings yet.</p>
                </div>
            ) : (
                <motion.ul
                    initial="hidden"
                    animate="visible"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
                    className="space-y-3"
                >
                    {history.map((m) => {
                        const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.calling;
                        const Icon = cfg.icon;
                        const isHost = m.hostId === session?.user.id;

                        return (
                            <motion.li
                                key={m.id}
                                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                                className="bg-white/[0.03] border border-white/[0.07] rounded-2xl px-6 py-4 flex items-center gap-4"
                            >
                                <div className={`${cfg.bg} p-2.5 rounded-xl`}>
                                    <Icon size={18} className={cfg.color} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-white">
                                            {isHost ? "You called" : `${m.hostName ?? "Unknown"} called you`}
                                        </p>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                            {cfg.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/30 mt-0.5">
                                        {new Date(m.createdAt).toLocaleString()} · Duration: {duration(m.startedAt, m.endedAt)}
                                    </p>
                                </div>

                                <p className="text-xs text-white/20 font-mono shrink-0">
                                    #{m.id.slice(0, 8)}
                                </p>
                            </motion.li>
                        );
                    })}
                </motion.ul>
            )}
        </div>
    );
}