"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    StreamVideo,
    StreamVideoClient,
    StreamCall,
    CallControls,
    SpeakerLayout,
    StreamTheme,
    useCallStateHooks,
    CallingState,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc-client";
import { Loader2, PhoneOff } from "lucide-react";

// ── Inner component: has access to call state ────────────────────────────────
function MeetingRoom({
    meetingId,
    onLeave,
}: {
    meetingId: string;
    onLeave: () => void;
}) {
    const { useCallCallingState, useParticipantCount } = useCallStateHooks();
    const callingState = useCallCallingState();
    const participantCount = useParticipantCount();

    if (callingState === CallingState.LEFT) {
        onLeave();
        return null;
    }

    if (
        callingState === CallingState.JOINING ||
        callingState === CallingState.RINGING
    ) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 size={32} className="text-[#035efc] animate-spin" />
                <p className="text-white/60 text-sm">
                    {callingState === CallingState.RINGING ? "Ringing…" : "Joining…"}
                </p>
            </div>
        );
    }

    return (
        <StreamTheme>
            <div className="flex flex-col h-full">
                {/* Header bar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#0d0d14]">
                    <div>
                        <span className="text-sm font-semibold text-white">MeetYou</span>
                        <span className="ml-3 text-xs text-white/30 font-mono">#{meetingId.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-white/40">{participantCount} participant{participantCount !== 1 ? "s" : ""}</span>
                    </div>
                </div>

                {/* Video layout */}
                <div className="flex-1 bg-[#0a0a0f] p-4">
                    <SpeakerLayout participantsBarPosition="bottom" />
                </div>

                {/* Controls */}
                <div className="border-t border-white/[0.06] bg-[#0d0d14] px-6 py-4 flex justify-center">
                    <CallControls onLeave={onLeave} />
                </div>
            </div>
        </StreamTheme>
    );
}

// ── Page component ────────────────────────────────────────────────────────────
export default function MeetingPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: meetingId } = use(params);
    const router = useRouter();
    const { data: session } = useSession();

    const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
    const [call, setCall] = useState<ReturnType<StreamVideoClient["call"]> | null>(null);
    const [ready, setReady] = useState(false);

    const { data: tokenData } = trpc.meetings.getStreamToken.useQuery(undefined, {
        enabled: !!session,
    });
    const { data: meeting } = trpc.meetings.getById.useQuery(
        { meetingId },
        { enabled: !!session }
    );
    const updateStatus = trpc.meetings.updateStatus.useMutation();

    // Init Stream client & join the call
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

        const streamCall = client.call("default", meetingId);

        streamCall
            .join({ create: false })
            .then(() => {
                setStreamClient(client);
                setCall(streamCall);
                setReady(true);
                // Mark as active in DB
                updateStatus.mutate({ meetingId, status: "active" });
            })
            .catch((err) => {
                console.error("Failed to join call:", err);
                router.push("/dashboard");
            });

        return () => {
            streamCall.leave().catch(() => { });
            client.disconnectUser();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, tokenData?.token, meetingId]);

    async function handleLeave() {
        await updateStatus.mutateAsync({ meetingId, status: "ended" });
        router.push("/dashboard");
    }

    if (!ready || !streamClient || !call) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4">
                <Loader2 size={32} className="text-[#035efc] animate-spin" />
                <p className="text-white/40 text-sm">Setting up your call…</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
            <StreamVideo client={streamClient}>
                <StreamCall call={call}>
                    <MeetingRoom meetingId={meetingId} onLeave={handleLeave} />
                </StreamCall>
            </StreamVideo>
        </div>
    );
}