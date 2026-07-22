import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

/**
 * A headline metric tile for the admin dashboard (ADMIN-01) and reused by later
 * modules. Sharp-cornered, high-contrast card with a red-accented icon.
 */
export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-card border-border flex items-center gap-4 border p-5">
      <div className="bg-muted text-primary flex size-11 items-center justify-center">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <p className="text-foreground text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
