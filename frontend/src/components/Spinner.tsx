interface SpinnerProps {
  className?: string;
}

export default function Spinner({ className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="読み込み中"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        className="opacity-25"
      />
      <path
        d="M4 12a8 8 0 018-8"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="opacity-75"
      />
    </svg>
  );
}
