"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { useAuth } from "@/context/AuthProvider";

const nav = [
  { href: "/dashboard", label: "Sports" },
  { href: "/reports", label: "Reports" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader({
  title = "EVALSCOUT",
  subtitle = "Multi-Sport Evaluation Platform",
}: {
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="glass mb-6 flex flex-wrap items-center gap-3 p-3.5">
      <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex min-w-0 flex-1 items-center gap-3">
        <LogoMark />
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-black tracking-tight text-lime-400 sm:text-3xl">
            {title}
          </h1>
          <p className="truncate text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-muted">
            {subtitle}
          </p>
        </div>
      </Link>

      {isAuthenticated && (
        <nav className="flex flex-wrap items-center gap-2" aria-label="Main">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2 text-sm font-bold ${
                  active ? "bg-lime-400 text-ink" : "bg-surface-strong text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-surface-strong px-3 py-2 text-sm font-bold text-foreground"
            aria-label={`Sign out ${user?.email ?? ""}`}
          >
            Sign out
          </button>
        </nav>
      )}
    </header>
  );
}
