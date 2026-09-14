import Link from "next/link";
import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Home",
};

export default function HomePage() {
  return (
    <main className="page">
      <AppHeader />
      <section className="glass mb-5 p-6">
        <span className="mb-3 inline-flex rounded-full bg-[color-mix(in_srgb,var(--lime)_16%,transparent)] px-3 py-2 text-[0.72rem] font-black uppercase tracking-[0.14em] text-lime-400">
          Multi-Sport Evaluations
        </span>
        <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-7xl">
          Evaluate. Rank. Report.
        </h2>
        <p className="mt-4 max-w-2xl text-muted">
          Build rosters, score skills 0–100, and share rankings — connected to the EvalScout API
          for coaches across soccer, basketball, baseball, and more.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login" className="btn inline-block no-underline">
            Sign in
          </Link>
          <Link href="/register" className="btn btn-secondary inline-block no-underline">
            Create account
          </Link>
          <Link href="/login" className="btn btn-secondary inline-block no-underline">
            Open dashboard
          </Link>
        </div>
      </section>
      <section className="glass p-[18px] text-sm text-muted">
        Demo coach: <strong className="text-foreground">coach@evalscout.org</strong> /{" "}
        <strong className="text-foreground">Coach123!</strong>
      </section>
    </main>
  );
}
