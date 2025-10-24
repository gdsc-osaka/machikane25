import { VisitorSessionStatus } from "@/domain/visitorSession";
import { cn } from "@/lib/utils";

export type StatusBadgeProps = Readonly<{
  status: VisitorSessionStatus;
  label: string;
  className?: string;
}>;

const statusStyles: Readonly<Record<VisitorSessionStatus, string>> = {
  capturing: "bg-sky-500/20 text-sky-200 border border-sky-500/40",
  "selecting-theme":
    "bg-indigo-500/20 text-indigo-200 border border-indigo-500/40",
  generating: "bg-amber-500/20 text-amber-200 border border-amber-500/40",
  completed: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40",
  failed: "bg-rose-600/20 text-rose-200 border border-rose-600/40",
  expired: "bg-neutral-600/20 text-neutral-300 border border-neutral-600/40",
};

export const StatusBadge = ({ status, label, className }: StatusBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
      statusStyles[status],
      className,
    )}
  >
    {label}
  </span>
);
