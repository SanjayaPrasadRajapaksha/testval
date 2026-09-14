export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`grid h-12 w-12 place-items-center rounded-2xl bg-white text-lime-400 ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 140" className="h-8 w-7" role="img">
        <path
          d="M60 8 104 24v45c0 31-18 53-44 63-26-10-44-32-44-63V24L60 8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
        />
        <path
          d="M32 88l22-24 18 14 24-34"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M32 104h56"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
