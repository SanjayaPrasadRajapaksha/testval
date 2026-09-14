export function EmptyState({ title, body }) {
  return (
    <section className="glass empty-state">
      <strong>{title}</strong>
      <p className="muted">{body}</p>
    </section>
  );
}

export function Stat({ label, value }) {
  return (
    <div className="stat">
      <strong className="text-lime">{value}</strong>
      <span className="eyebrow muted">{label}</span>
    </div>
  );
}

export function Field({ id, label, children, hint }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <p className="field__hint muted">{hint}</p> : null}
    </div>
  );
}
