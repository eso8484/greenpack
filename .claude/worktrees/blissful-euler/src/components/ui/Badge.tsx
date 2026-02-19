import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "green" | "yellow" | "red" | "outline";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  green: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800",
  yellow: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800",
  red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800",
  outline: "bg-transparent text-gray-600 ring-1 ring-inset ring-gray-300 dark:text-gray-400 dark:ring-gray-700",
};

export default function Badge({
  variant = "default",
  children,
  className,
  dot,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            variant === "green" && "bg-green-500",
            variant === "red" && "bg-red-500",
            variant === "yellow" && "bg-amber-500",
            (variant === "default" || variant === "outline") && "bg-gray-400"
          )}
        />
      )}
      {children}
    </span>
  );
}
