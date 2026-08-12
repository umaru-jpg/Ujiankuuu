"use client";

import Icon from "@/components/Icon";

export default function StatCard({
  label,
  value,
  icon,
  iconClass,
  sub,
}: {
  label: string;
  value: string;
  icon: string;
  iconClass: string;
  sub?: string;
}) {
  return (
    <div className="bg-surface rounded-xl p-4 shadow-sm border border-outline-variant flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full ${iconClass} flex items-center justify-center shrink-0`}>
        <Icon name={icon} size={24} />
      </div>
      <div className="min-w-0">
        <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
          {label}
        </p>
        <p className="font-headline-md text-headline-md text-on-surface">{value}</p>
        {sub && <p className="font-body-sm text-body-sm text-on-surface-variant">{sub}</p>}
      </div>
    </div>
  );
}
