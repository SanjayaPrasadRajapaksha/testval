import type { Metadata } from "next";
import { Oswald, Source_Sans_3 } from "next/font/google";
import { AuthProvider } from "@/context/AuthProvider";
import { ThemeSync } from "@/components/ThemeSync";
import "./globals.css";

const display = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "EvalScout — Multi-Sport Player Evaluations",
    template: "%s | EvalScout",
  },
  description:
    "EvalScout helps coaches evaluate youth athletes across sports with rosters, skill ratings, rankings, and shareable reports.",
  applicationName: "EvalScout",
  keywords: ["EvalScout", "coach evaluations", "youth sports", "player rankings", "roster"],
  openGraph: {
    title: "EvalScout",
    description: "Multi-sport evaluation platform for coaches.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <AuthProvider>
          <ThemeSync />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
