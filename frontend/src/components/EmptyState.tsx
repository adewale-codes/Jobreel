interface EmptyStateProps {
  message: string
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-10 w-10"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 9.75h16.5M3.75 9.75v8.25A1.5 1.5 0 005.25 19.5h13.5a1.5 1.5 0 001.5-1.5V9.75M3.75 9.75l1.5-4.5h13.5l1.5 4.5M9 13.5h6"
        />
      </svg>
      <p className="mt-3 text-sm">{message}</p>
    </div>
  )
}
