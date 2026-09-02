import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  badge?: ReactNode;
}

export function StatCard({ label, value, badge }: StatCardProps) {
  return (
    <div className="rounded border border-border bg-navy-surface p-6 shadow-md">
      <p className="text-xs font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-4xl font-black text-white">{value}</span>
        {badge && <div>{badge}</div>}
      </div>
    </div>
  );
}
