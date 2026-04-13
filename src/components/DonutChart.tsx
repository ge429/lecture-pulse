"use client";

import { SIGNALS, SIGNAL_KEYS } from "@/lib/constants";
import { useLocale } from "./LocaleProvider";

interface Stats {
  understood: number;
  confused: number;
  lost: number;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  start: number,
  end: number,
) {
  if (end - start >= 360) end = start + 359.99;
  const large = end - start > 180 ? 1 : 0;
  const outerStart = polar(cx, cy, outerR, start);
  const outerEnd = polar(cx, cy, outerR, end);
  const innerEnd = polar(cx, cy, innerR, end);
  const innerStart = polar(cx, cy, innerR, start);
  return (
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)} ` +
    `A ${outerR} ${outerR} 0 ${large} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)} ` +
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)} ` +
    `A ${innerR} ${innerR} 0 ${large} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)} Z`
  );
}

export default function DonutChart({ stats }: { stats: Stats }) {
  const { t } = useLocale();
  const total = stats.understood + stats.confused + stats.lost;
  const cx = 80, cy = 80, outerR = 68, innerR = 44;

  const segments = SIGNALS.map((s) => ({
    value: stats[s.id],
    color: s.hex,
    label: t(SIGNAL_KEYS[s.id]),
  }));

  let cursor = 0;
  const slices = segments.map((seg) => {
    const sweep = total > 0 ? (seg.value / total) * 360 : 0;
    const start = cursor;
    cursor += sweep;
    return { ...seg, start, sweep };
  });

  const confusionPct =
    total > 0 ? Math.round(((stats.confused + stats.lost) / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <svg width="140" height="140" viewBox="0 0 160 160" className="shrink-0 sm:w-[160px] sm:h-[160px]">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#e2e8f0" strokeWidth={innerR - 4} />
        ) : (
          slices.map((s, i) =>
            s.sweep > 0 ? (
              <path
                key={i}
                d={donutSlice(cx, cy, outerR, innerR, s.start, s.start + s.sweep)}
                fill={s.color}
                className="transition-all duration-500"
              />
            ) : null
          )
        )}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--foreground)">
          {total > 0 ? `${confusionPct}%` : "—"}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="var(--muted)">
          {t("chart.confusion")}
        </text>
      </svg>

      <div className="flex flex-col gap-3 text-sm">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div key={seg.label} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full shrink-0"
                style={{ background: seg.color }}
              />
              <span className="text-muted w-16">{seg.label}</span>
              <span className="font-bold tabular-nums">{seg.value}{t("chart.people")}</span>
              <span className="text-muted tabular-nums text-xs">({pct}%)</span>
            </div>
          );
        })}
        <div className="pt-1 border-t border-border text-muted text-xs">
          {t("chart.total")} {total}{t("chart.people")}
        </div>
      </div>
    </div>
  );
}
