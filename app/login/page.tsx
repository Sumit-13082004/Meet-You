"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Github, Mail, Eye, EyeOff, Loader2 } from "lucide-react"
import { signIn } from "@/lib/auth-client"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        setLoading(true)

        const { error: signInError } = await signIn.email({ email, password })

        if (signInError) {
            setError(signInError.message ?? "Invalid credentials. Please try again.")
            setLoading(false)
            return
        }

        router.push("/dashboard")
    }

    async function handleGoogle() {
        await signIn.social({ provider: "google", callbackURL: "/dashboard" })
    }

    async function handleGithub() {
        await signIn.social({ provider: "github", callbackURL: "/dashboard" })
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#035efc]/10 to-white px-6 py-16">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex w-[880px] max-w-full bg-white rounded-2xl shadow-xl overflow-hidden"
            >
                {/* LEFT SIDE — FORM */}
                <div className="w-1/2 p-10 flex flex-col justify-center">
                    <h1 className="text-3xl font-bold text-[#035efc] mb-1 text-center">Welcome Back</h1>
                    <p className="text-sm text-gray-500 mb-6 text-center">Sign in to your MeetYou account.</p>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {/* EMAIL */}
                        <div>
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                placeholder="you@email.com"
                                value={email}
                                required
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full mt-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#035efc] transition"
                            />
                        </div>

                        {/* PASSWORD */}
                        <div>
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-gray-700">Password</label>
                                {/* Placeholder for future forgot-password route */}
                                <span className="text-xs text-[#035efc] hover:underline cursor-pointer">Forgot password?</span>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Your password"
                                    value={password}
                                    required
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full mt-1 px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#035efc] transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* ERROR */}
                        <AnimatePresence>
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        {/* SUBMIT */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#035efc] text-white py-2.5 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {loading ? "Signing in…" : "Sign In"}
                        </button>
                    </form>

                    {/* DIVIDER */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400">or continue with</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* SOCIAL */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleGoogle}
                            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50 transition"
                        >
                            <Mail size={16} /> Google
                        </button>
                        <button
                            onClick={handleGithub}
                            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50 transition"
                        >
                            <Github size={16} /> GitHub
                        </button>
                    </div>

                    <p className="text-center text-sm text-gray-500 mt-5">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-[#035efc] font-medium hover:underline">
                            Create one
                        </Link>
                    </p>
                </div>

                {/* RIGHT SIDE — IMAGE */}
                <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-1/2 flex items-center justify-center bg-gradient-to-br from-[#035efc]/5 to-[#035efc]/15 p-8"
                >
                    <Image
                        src="/signup/meet-meow-side.jpeg"
                        alt="MeetYou preview"
                        width={420}
                        height={420}
                        className="rounded-2xl shadow-2xl object-cover"
                    />
                </motion.div>
            </motion.div>
        </div>
    )
}