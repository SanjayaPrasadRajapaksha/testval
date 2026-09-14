import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports",
  description: "Player rankings and email share summaries.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
