import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sport evaluation",
  description: "Roster, evaluate, and rankings for a selected sport.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
