import Link from "next/link";
import Button from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-950/20 rounded-3xl flex items-center justify-center mb-6 shadow-inner-green">
        <svg
          className="w-10 h-10 text-green-500 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button size="lg">{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
