'use client';

export function LoadingIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`${className} animate-spin text-zinc-900`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2.75c1.1 0 2 .9 2 2v4.15a2 2 0 0 1-4 0V4.75c0-1.1.9-2 2-2Z"
        fill="currentColor"
      />
      <path
        d="M21.25 12c0 1.1-.9 2-2 2H15.1a2 2 0 0 1 0-4h4.15c1.1 0 2 .9 2 2Z"
        fill="currentColor"
      />
      <path
        d="M12 21.25c-1.1 0-2-.9-2-2V15.1a2 2 0 0 1 4 0v4.15c0 1.1-.9 2-2 2Z"
        fill="currentColor"
      />
      <path
        d="M2.75 12c0-1.1.9-2 2-2H8.9a2 2 0 0 1 0 4H4.75c-1.1 0-2-.9-2-2Z"
        fill="currentColor"
      />
    </svg>
  );
}
