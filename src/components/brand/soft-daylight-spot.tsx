/** Spot Soft Daylight: path/curva navy per empty state. */
export function SoftDaylightSpot({
  className = "",
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <div className={`mx-auto flex flex-col items-center gap-3 ${className}`}>
      <svg
        width="120"
        height="88"
        viewBox="0 0 120 88"
        fill="none"
        aria-hidden
        className="text-[var(--ink)] opacity-80"
      >
        <path
          d="M8 62c18-28 36-40 52-40 16 0 28 10 40 28 8 12 14 20 20 26"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        />
        <path
          d="M14 68c16-22 32-32 46-32s26 8 36 22c7 10 12 16 18 20"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
        <circle cx="98" cy="28" r="10" stroke="currentColor" strokeWidth="2" />
        <circle cx="98" cy="28" r="3.5" fill="currentColor" opacity="0.45" />
      </svg>
      {title ? (
        <p className="max-w-[16rem] text-center text-sm text-[var(--muted)]">{title}</p>
      ) : null}
    </div>
  );
}
