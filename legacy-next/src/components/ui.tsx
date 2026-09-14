export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="glass empty rounded-[22px] p-[18px]">
      <strong className="block text-foreground">{title}</strong>
      <p className="mt-1 text-muted">{body}</p>
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-surface-strong p-3.5">
      <strong className="block text-3xl font-black text-lime-400">{value}</strong>
      <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
    </div>
  );
}

export function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
