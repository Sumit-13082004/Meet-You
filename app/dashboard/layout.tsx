"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Clock,
    Bell,
    LogOut,
    PhoneCall,
    PhoneOff,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc-client";
import { motion, AnimatePresence } from "framer-motion";
import {
    StreamVideo,
    StreamVideoClient,
    useStreamVideoClient,
} from "@stream-io/video-react-sdk";
import type { Call } from "@stream-io/video-react-sdk";

// ─────────────────────────────────────────────────────────────────────────────
// Incoming call banner — rendered inside StreamVideo context
// ─────────────────────────────────────────────────────────────────────────────
function IncomingCallBanner({
    call,
    callerName,
    onAccept,
    onDecline,
}: {
    call: Call;
    callerName: string;
    onAccept: () => void;
    onDecline: () => void;
}) {
    // Auto-dismiss after 30 s (Stream's default ring timeout)
    useEffect(() => {
        const t = setTimeout(onDecline, 30_000);
        return () => clearTimeout(t);
    }, [onDecline]);

    return (
        <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-[340px]
                 bg-[#0d0d14] border border-[#035efc]/30 rounded-2xl
                 shadow-2xl shadow-[#035efc]/10 px-5 py-4 flex items-center gap-4"
        >
            {/* Pulsing avatar */}
            <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#035efc]/20 border border-[#035efc]/40
                        flex items-center justify-center text-lg font-bold text-[#035efc]">
                    {callerName.charAt(0).toUpperCase()}
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400
                         ring-2 ring-[#0d0d14] animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 mb-0.5">Incoming call</p>
                <p className="text-sm font-semibold text-white truncate">{callerName}</p>
            </div>

            <div className="flex gap-2 shrink-0">
                <button
                    onClick={onDecline}
                    className="w-9 h-9 flex items-center justify-center rounded-full
                     bg-red-500/15 text-red-400 hover:bg-red-500/30 transition"
                >
                    <PhoneOff size={15} />
                </button>
                <button
                    onClick={onAccept}
                    className="w-9 h-9 flex items-center justify-center rounded-full
                     bg-[#035efc] text-white hover:brightness-110 transition"
                >
                    <PhoneCall size={15} />
                </button>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ring listener — must live inside <StreamVideo> so it can use the client hook
// ─────────────────────────────────────────────────────────────────────────────
function RingListener({ userId }: { userId: string }) {
    const router = useRouter();
    const streamClient = useStreamVideoClient();
    const updateStatus = trpc.meetings.updateStatus.useMutation();

    const [incomingCall, setIncomingCall] = useState<Call | null>(null);
    const [callerName, setCallerName] = useState("Someone");
    // Keep a stable ref so the event handler closure always sees latest call
    const incomingCallRef = useRef<Call | null>(null);

    useEffect(() => {
        if (!streamClient) return;

        // Stream fires this event when this user receives a ring
        const unsubscribe = streamClient.on("call.ring", (event) => {
            const call = streamClient.call(event.call.type, event.call.id);

            type RingMember = { user_id: string; user?: { name?: string } };
            const members = (event as unknown as { members?: RingMember[] }).members ?? [];
            const caller = members.find((m) => m.user_id !== userId);
            const name = caller?.user?.name ?? "Someone";

            incomingCallRef.current = call;
            setCallerName(name);
            setIncomingCall(call);
        });

        return () => {
            unsubscribe();
        };
    }, [streamClient, userId]);

    async function handleAccept() {
        const call = incomingCallRef.current;
        if (!call) return;
        try {
            await call.accept();
            await updateStatus.mutateAsync({ meetingId: call.id, status: "active" });
            setIncomingCall(null);
            router.push(`/meeting/${call.id}`);
        } catch (err) {
            console.error("Accept failed", err);
        }
    }

    async function handleDecline() {
        const call = incomingCallRef.current;
        if (!call) return;
        try {
            await call.reject();
            await updateStatus.mutateAsync({ meetingId: call.id, status: "declined" });
        } catch (err) {
            console.error("Decline failed", err);
        } finally {
            setIncomingCall(null);
            incomingCallRef.current = null;
        }
    }

    return (
        <AnimatePresence>
            {incomingCall && (
                <IncomingCallBanner
                    call={incomingCall}
                    callerName={callerName}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                />
            )}
        </AnimatePresence>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav items
// ─────────────────────────────────────────────────────────────────────────────
const NAV = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/users", label: "People", icon: Users },
    { href: "/dashboard/meetings", label: "Past Meetings", icon: Clock },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session, isPending } = useSession();

    // Notification badge (still polling as fallback)
    const { data: invites } = trpc.meetings.getPendingInvites.useQuery(
        undefined,
        { enabled: !!session, refetchInterval: 8_000 }
    );
    const pendingCount = invites?.length ?? 0;

    // Stream token
    const { data: tokenData } = trpc.meetings.getStreamToken.useQuery(
        undefined,
        { enabled: !!session }
    );

    // Persistent StreamVideoClient for the whole dashboard
    const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);

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

        return () => {
            client.disconnectUser().catch(console.error);
            setStreamClient(null);
        };
    }, [session, tokenData?.token]);

    // Auth guard
    useEffect(() => {
        if (!isPending && !session) router.push("/login");
    }, [isPending, session, router]);

    if (isPending || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="w-8 h-8 rounded-full border-2 border-[#035efc] border-t-transparent animate-spin" />
            </div>
        );
    }

    const name = session.user.name ?? "User";
    const initial = name.charAt(0).toUpperCase();

    async function handleSignOut() {
        if (streamClient) await streamClient.disconnectUser().catch(console.error);
        await signOut();
        router.push("/login");
    }

    const sidebar = (
        <aside className="w-64 shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0d0d14]">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-white/[0.06]">
                <span className="text-xl font-bold tracking-tight">
                    <span className="text-[#035efc]">Meet</span>
                    <span className="text-white">You</span>
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV.map(({ href, label, icon: Icon, exact }) => {
                    const active = exact ? pathname === href : pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                text-sm font-medium transition-all duration-150
                ${active
                                    ? "bg-[#035efc]/15 text-[#035efc]"
                                    : "text-white/50 hover:text-white hover:bg-white/[0.05]"}
              `}
                        >
                            {active && (
                                <motion.div
                                    layoutId="sidebar-pill"
                                    className="absolute inset-0 rounded-xl bg-[#035efc]/10 border border-[#035efc]/20"
                                />
                            )}
                            <Icon size={17} className="relative z-10 shrink-0" />
                            <span className="relative z-10">{label}</span>

                            {label === "Notifications" && pendingCount > 0 && (
                                <span className="relative z-10 ml-auto bg-[#035efc] text-white
                                 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User footer */}
            <div className="px-3 pb-4 border-t border-white/[0.06] pt-4">
                <div className="flex items-center gap-3 px-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#035efc] flex items-center justify-center
                          text-sm font-bold shrink-0">
                        {initial}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-white/40 truncate">{session.user.email}</p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm
                     text-white/40 hover:text-red-400 hover:bg-red-500/10 transition"
                >
                    <LogOut size={15} />
                    Sign out
                </button>
            </div>
        </aside>
    );

    // Wrap everything in StreamVideo so RingListener + child pages share the same client
    const inner = (
        <div className="flex min-h-screen bg-[#0a0a0f] text-white">
            {sidebar}
            <main className="flex-1 overflow-auto">{children}</main>

            {/* Global ring listener — fires anywhere on dashboard */}
            <RingListener userId={session.user.id} />
        </div>
    );

    if (streamClient) {
        return <StreamVideo client={streamClient}>{inner}</StreamVideo>;
    }

    // Client not yet ready — render without ring listener (token loading)
    return (
        <div className="flex min-h-screen bg-[#0a0a0f] text-white">
            {sidebar}
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}