import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account",
  description: "Register for EvalScout and start evaluating athletes.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
