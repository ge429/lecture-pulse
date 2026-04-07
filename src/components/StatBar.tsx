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
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-sm font-medium">
        {emoji} {label}
      </span>
      <div className="flex-1 h-8 rounded-full bg-border/50 overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right text-sm font-bold tabular-nums">
        {count}명 ({pct}%)
      </span>
    </div>
  );
}
