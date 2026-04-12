import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Sora } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d0d17",
};

export const metadata: Metadata = {
  title: "Lecture Pulse",
  description: "실시간 수업 이해도 피드백 서비스",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lecture Pulse",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${sora.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col font-sans selection:bg-primary/30 selection:text-foreground">
        <div className="grainy-overlay" />
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
