import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono, VT323, Dancing_Script } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexus — The Anonymous Merit Network for Indian Campuses",
  description:
    "Find teammates, roommates, mentors, and opportunities — based on verified skills, not who you already know. Campus-verified. Anonymous-first.",
  keywords: ["campus network", "student platform", "hackathon team", "college app India", "anonymous networking"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable} ${vt323.variable} ${dancingScript.variable}`}
    >
      <body className="font-display bg-[#06060e] text-[#e8e8f0] antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
