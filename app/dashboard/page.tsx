"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { motion } from "framer-motion"
import { LogOut, Video, Calendar, Clock, Users } from "lucide-react"
import { useSession, signOut } from "@/lib/auth-client"

const STAT_CARDS = [
    { icon: Video, label: "Meetings today", value: "0" },
    { icon: Calendar, label: "Scheduled", value: "0" },
    { icon: Clock, label: "Hours this week", value: "0h" },
    { icon: Users, label: "Contacts", value: "0" },
]

export default function DashboardPage() {
    const router = useRouter()
    const { data: session, isPending } = useSession()
    
    // Redirect unauthenticated users
    useEffect(() => {
        if (!isPending && !session) {
            router.push("/login")
        }
    }, [isPending, session, router])

    async function handleSignOut() {
        await signOut()
        router.push("/login")
    }

    if (isPending || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-[#035efc] border-t-transparent animate-spin" />
            </div>
        )
    }

    const userName = session.user.name ?? "there"
    const userEmail = session.user.email
    const userInitial = userName.charAt(0).toUpperCase()

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#035efc]/8 via-white to-blue-50">

            {/* TOP NAV */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-[#035efc]">Meet</span>
                    <span className="text-xl font-bold text-gray-800">You</span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#035efc] text-white flex items-center justify-center text-sm font-bold">
                            {userInitial}
                        </div>
                        <span className="text-sm text-gray-700 hidden sm:block">{userEmail}</span>
                    </div>

                    {/* Sign out */}
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition px-3 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100"
                    >
                        <LogOut size={15} />
                        Sign out
                    </button>
                </div>
            </header>

            {/* MAIN */}
            <main className="max-w-5xl mx-auto px-6 py-12">

                {/* WELCOME */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-10"
                >
                    <h1 className="text-4xl font-bold text-gray-900">
                        Hey, <span className="text-[#035efc]">{userName}</span> 👋
                    </h1>
                    <p className="text-gray-500 mt-1 text-lg">
                        Welcome to MeetYou. Ready for your next 1:1?
                    </p>
                </motion.div>

                {/* STATS ROW */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
                >
                    {STAT_CARDS.map(({ icon: Icon, label, value }) => (
                        <div
                            key={label}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2"
                        >
                            <Icon size={20} className="text-[#035efc]" />
                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                            <p className="text-xs text-gray-400">{label}</p>
                        </div>
                    ))}
                </motion.div>

                {/* CTA CARDS */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="grid md:grid-cols-2 gap-6"
                >
                    {/* Start a meeting */}
                    <div className="bg-[#035efc] text-white rounded-2xl p-8 flex flex-col gap-4 shadow-lg shadow-[#035efc]/20">
                        <Video size={28} />
                        <h2 className="text-xl font-bold">Start a Meeting</h2>
                        <p className="text-blue-100 text-sm">Launch an instant 1:1 call. No scheduling needed.</p>
                        <button className="mt-auto bg-white text-[#035efc] font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition w-fit">
                            Start now →
                        </button>
                    </div>

                    {/* Join with link */}
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 flex flex-col gap-4">
                        <Calendar size={28} className="text-[#035efc]" />
                        <h2 className="text-xl font-bold text-gray-900">Join a Meeting</h2>
                        <p className="text-gray-400 text-sm">Got a meeting link? Paste it here to join instantly.</p>
                        <div className="flex gap-2 mt-auto">
                            <input
                                type="text"
                                placeholder="Paste meeting link…"
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#035efc]"
                            />
                            <button className="bg-[#035efc] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
                                Join
                            </button>
                        </div>
                    </div>
                </motion.div>

            </main>
        </div>
    )
}