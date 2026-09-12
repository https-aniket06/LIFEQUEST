import type { Metadata } from "next";
import { Press_Start_2P, Space_Grotesk } from "next/font/google";
import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LIFEQUEST — Turn Your Life Into an RPG",
  description:
    "LIFEQUEST turns real-world goals into quests. Complete tasks, earn XP and gold, level up your character, and build streaks — for your actual life.",
  openGraph: {
    title: "LIFEQUEST — Turn Your Life Into an RPG",
    description: "Real-world goals become quests. Real progress becomes a character you grow.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixelFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-ink text-ink-text antialiased">{children}</body>
    </html>
  );
}
