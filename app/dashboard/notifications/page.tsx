"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, PhoneCall, PhoneOff, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc-client";
import {
    StreamVideo,
    StreamVideoClient,
    useCall,
    useStreamVideoClient,
} from "@stream-io/video-react-sdk";

// ── Inner component needs StreamVideo context ─────────────────────────────────
function InviteCard({
    invite,
    onHandled,
}: {
    invite: {
        id: string;
        hostName: string | null;
        hostEmail: string | null;
        hostId: string;
        createdAt: Date;
    };
    onHandled: () => void;
}) {
    const router = useRouter();
    const streamVideoClient = useStreamVideoClient();
    const updateStatus = trpc.meetings.updateStatus.useMutation();
    const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

    async function accept() {
        if (!streamVideoClient) return;
        setLoading("accept");
        try {
            const call = streamVideoClient.call("default", invite.id);
            await call.accept();
            await updateStatus.mutateAsync({ meetingId: invite.id, status: "active" });
            router.push(`/meeting/${invite.id}`);
        } catch (err) {
            console.error(err);
            setLoading(null);
        }
    }

    async function decline() {
        if (!streamVideoClient) return;
        setLoading("decline");
        try {
            const call = streamVideoClient.call("default", invite.id);
            await call.reject();
            await updateStatus.mutateAsync({ meetingId: invite.id, status: "declined" });
            onHandled();
        } catch (err) {
            console.error(err);
            setLoading(null);
        }
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white/[0.03] border border-[#035efc]/20 rounded-2xl px-6 py-5 flex items-center gap-5"
        >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-[#035efc]/20 border border-[#035efc]/30 flex items-center justify-center text-lg font-bold text-[#035efc] shrink-0">
                {(invite.hostName ?? "?").charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                    {invite.hostName ?? "Someone"} is calling you
                </p>
                <p className="text-xs text-white/40 truncate">{invite.hostEmail}</p>
                <p className="text-[10px] text-white/20 mt-1">
                    {new Date(invite.createdAt).toLocaleTimeString()}
                </p>
            </div>

            <div className="flex gap-2 shrink-0">
                <button
                    onClick={decline}
                    disabled={!!loading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition disabled:opacity-50"
                >
                    {loading === "decline" ? <Loader2 size={14} className="animate-spin" /> : <PhoneOff size={14} />}
                    Decline
                </button>
                <button
                    onClick={accept}
                    disabled={!!loading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#035efc] text-white text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                    {loading === "accept" ? <Loader2 size={14} className="animate-spin" /> : <PhoneCall size={14} />}
                    Accept
                </button>
            </div>
        </motion.div>
    );
}

// ── Notifications page ────────────────────────────────────────────────────────
export default function NotificationsPage() {
    const { data: session } = useSession();
    const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);

    const { data: tokenData } = trpc.meetings.getStreamToken.useQuery(undefined, {
        enabled: !!session,
    });

    const {
        data: invites = [],
        refetch,
    } = trpc.meetings.getPendingInvites.useQuery(undefined, {
        enabled: !!session,
        refetchInterval: 6000,
    });

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

    const content = (
        <div className="p-8 max-w-3xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-8 flex items-center gap-3"
            >
                <Bell size={22} className="text-[#035efc]" />
                <div>
                    <h1 className="text-3xl font-bold text-white">Notifications</h1>
                    <p className="text-white/40 text-sm">Incoming call invitations.</p>
                </div>
            </motion.div>

            {invites.length === 0 ? (
                <div className="text-center py-24 text-white/20">
                    <Bell size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No pending invitations.</p>
                </div>
            ) : (
                <AnimatePresence mode="popLayout">
                    <div className="space-y-4">
                        {invites.map((inv) => (
                            <InviteCard
                                key={inv.id}
                                invite={{
                                    id: inv.id,
                                    hostName: inv.hostName ?? null,
                                    hostEmail: inv.hostEmail ?? null,
                                    hostId: inv.hostId,
                                    createdAt: inv.createdAt,
                                }}
                                onHandled={() => refetch()}
                            />
                        ))}
                    </div>
                </AnimatePresence>
            )}
        </div>
    );

    if (streamClient) {
        return <StreamVideo client={streamClient}>{content}</StreamVideo>;
    }
    return content;
}