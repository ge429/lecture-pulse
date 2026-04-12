"use client";

import { useLocale } from "./LocaleProvider";

export default function StatBar({
  label,
  emoji,
  count,
  total,
  color,
}: {
  label: string;
  emoji: string;
  count: number;
  total: number;
  color: string;
}) {
  const { t } = useLocale();
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="w-16 sm:w-20 text-xs sm:text-sm font-bold text-foreground">
        {emoji} {label}
      </span>
      <div className="flex-1 h-5 sm:h-6 rounded-full bg-border/30 overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-14 sm:w-16 text-right text-[10px] sm:text-xs font-bold tabular-nums text-muted">
        {count}{t("chart.people")} ({pct}%)
      </span>
    </div>
  );
}
