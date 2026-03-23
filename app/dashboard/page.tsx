"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Video, X, Search, Loader2, PhoneCall } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc-client";
import {
    StreamVideo,
    StreamVideoClient,
} from "@stream-io/video-react-sdk";

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    );
}

function Avatar({ name }: { name: string }) {
    return (
        <div className="w-10 h-10 rounded-full bg-[#035efc]/20 border border-[#035efc]/30 flex items-center justify-center font-bold text-[#035efc] shrink-0 text-sm">
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

export default function DashboardPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState("");
    const [callingUserId, setCallingUserId] = useState<string | null>(null);
    const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);

    const { data: tokenData } = trpc.meetings.getStreamToken.useQuery(undefined, {
        enabled: !!session,
    });
    const { data: users = [] } = trpc.users.getAll.useQuery(undefined, {
        enabled: !!session,
    });
    const { data: history = [] } = trpc.meetings.getHistory.useQuery(undefined, {
        enabled: !!session,
    });
    const createMeeting = trpc.meetings.create.useMutation();

    useEffect(() => {
        if (!session || !tokenData?.token) return;
        const client = new StreamVideoClient({
            apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!,
            user: {
                id: session.user.id,
                name: session.user.name ?? "User",
                image: session.user.image ?? undefined,
            },
            token: tokenData.token,
        });
        setStreamClient(client);
        return () => { client.disconnectUser(); setStreamClient(null); };
    }, [session, tokenData?.token]);

    const filteredUsers = users.filter(
        (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
    );

    const totalMeetings = history.length;
    const missedMeetings = history.filter((m) => m.status === "missed").length;
    const endedMeetings = history.filter((m) => m.status === "ended").length;

    async function handleCall(inviteeId: string) {
        if (!streamClient || callingUserId) return;
        setCallingUserId(inviteeId);
        try {
            const { meetingId } = await createMeeting.mutateAsync({ inviteeId });
            const call = streamClient.call("default", meetingId);
            await call.getOrCreate({
                ring: true,
                data: {
                    members: [
                        { user_id: session!.user.id },
                        { user_id: inviteeId },
                    ],
                },
            });
            setShowModal(false);
            router.push(`/meeting/${meetingId}`);
        } catch (err) {
            console.error("Call failed", err);
            setCallingUserId(null);
        }
    }

    const name = session?.user.name ?? "there";
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    const inner = (
        <div className="p-8 max-w-5xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-10"
            >
                <p className="text-white/40 text-sm mb-1">{greeting},</p>
                <h1 className="text-4xl font-bold text-white">
                    {name} <span className="text-[#035efc]">👋</span>
                </h1>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="grid grid-cols-3 gap-4 mb-10"
            >
                <StatCard label="Total Meetings" value={String(totalMeetings)} />
                <StatCard label="Completed" value={String(endedMeetings)} />
                <StatCard label="Missed" value={String(missedMeetings)} />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.16 }}
                className="grid md:grid-cols-2 gap-6"
            >
                {/* Start meeting CTA */}
                <button
                    onClick={() => setShowModal(true)}
                    className="group relative overflow-hidden bg-[#035efc] rounded-2xl p-8 text-left transition hover:brightness-110 active:scale-[0.99]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <Video size={28} className="mb-4 text-white/80" />
                    <h2 className="text-xl font-bold text-white mb-1">Start a Meeting</h2>
                    <p className="text-blue-100/70 text-sm">
                        Pick someone and call them instantly — no scheduling needed.
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl group-hover:bg-white/30 transition">
                        <PhoneCall size={14} /> Call someone →
                    </div>
                </button>

                {/* Recent meetings */}
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
                    {history.length === 0 ? (
                        <p className="text-white/30 text-sm">No meetings yet. Start one above!</p>
                    ) : (
                        <ul className="space-y-3">
                            {history.slice(0, 5).map((m) => (
                                <li key={m.id} className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${m.status === "active" ? "bg-green-400" :
                                        m.status === "ended" ? "bg-white/20" :
                                            m.status === "missed" ? "bg-red-400" : "bg-yellow-400"
                                        }`} />
                                    <span className="text-sm text-white/60 truncate">
                                        {m.hostName ?? "Unknown"} · {new Date(m.createdAt).toLocaleDateString()}
                                    </span>
                                    <span className="ml-auto text-xs text-white/30 capitalize shrink-0">{m.status}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </motion.div>

            {/* CALL MODAL */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
                        onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 28 }}
                            className="bg-[#0d0d14] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                                <h3 className="text-base font-semibold text-white">Choose someone to call</h3>
                                <button onClick={() => setShowModal(false)} className="text-white/30 hover:text-white transition">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="px-6 pt-4 pb-2">
                                <div className="relative">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search by name or email…"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#035efc]/50"
                                    />
                                </div>
                            </div>

                            <ul className="px-3 pb-4 pt-2 max-h-72 overflow-y-auto space-y-1">
                                {filteredUsers.length === 0 ? (
                                    <li className="text-center text-white/30 text-sm py-8">No users found.</li>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <li key={u.id}>
                                            <button
                                                onClick={() => handleCall(u.id)}
                                                disabled={!!callingUserId}
                                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.05] transition text-left disabled:opacity-50"
                                            >
                                                <Avatar name={u.name} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-white truncate">{u.name}</p>
                                                    <p className="text-xs text-white/40 truncate">{u.email}</p>
                                                </div>
                                                {callingUserId === u.id ? (
                                                    <Loader2 size={16} className="text-[#035efc] animate-spin shrink-0" />
                                                ) : (
                                                    <PhoneCall size={15} className="text-white/20 shrink-0" />
                                                )}
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    // Wrap in StreamVideo only when client is ready
    if (streamClient) {
        return <StreamVideo client={streamClient}>{inner}</StreamVideo>;
    }
    return inner;
}