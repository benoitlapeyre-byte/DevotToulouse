import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}

export function StatCard({ label, value, highlight = false }: StatCardProps) {
  return (
    <div className={`dashboard-panel rounded-lg border bg-card p-5 ${highlight ? "border-l-4 border-l-primary" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}
