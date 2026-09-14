import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Choose a sport and open roster, evaluate, and rankings tools.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
