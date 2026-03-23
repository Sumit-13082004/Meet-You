import type { Metadata } from "next";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc-client";

export const metadata: Metadata = {
  title: "MeetYou",
  description: "1:1 video meetings, effortlessly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}