"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { useLocale } from "@/components/LocaleProvider";

interface ReportData {
  session: {
    name: string;
    code: string;
    createdAt: string;
    isActive: boolean;
  };
  stats: {
    uniqueStudents: number;
    totalResponses: number;
    typeCounts: { understood: number; confused: number; lost: number };
    timeline: {
      time: string;
      understood: number;
      confused: number;
      lost: number;
    }[];
  };
  questions: {
    total: number;
    clusters: { clusterId: number; count: number; questions: string[] }[];
    unclustered: string[];
  };
  materials: { fileName: string; hasSummary: boolean }[];
  aiSummary: string | null;
}

function TimelineChart({
  timeline,
}: {
  timeline: ReportData["stats"]["timeline"];
}) {
  if (timeline.length === 0) return null;

  const maxTotal = Math.max(
    ...timeline.map((t) => t.understood + t.confused + t.lost),
    1
  );

  return (
    <div className="flex items-end gap-1.5" style={{ height: 120 }}>
      {timeline.map((t, i) => {
        const total = t.understood + t.confused + t.lost;
        const h = (total / maxTotal) * 100;
        const uH = total > 0 ? (t.understood / total) * h : 0;
        const cH = total > 0 ? (t.confused / total) * h : 0;
        const lH = total > 0 ? (t.lost / total) * h : 0;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full flex flex-col justify-end rounded-t-md overflow-hidden"
              style={{ height: 100 }}
            >
              <div className="bg-success" style={{ height: `${uH}%` }} />
              <div className="bg-warning" style={{ height: `${cH}%` }} />
              <div className="bg-danger" style={{ height: `${lH}%` }} />
            </div>
            <span className="text-[10px] text-muted">{t.time}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { t } = useLocale();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase
        .from("sessions")
        .select("id")
        .eq("code", code)
        .single();

      if (!session) {
        setError("존재하지 않는 수업입니다.");
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/report?sessionId=${session.id}`);
      if (!res.ok) {
        setError(t("report.error"));
        setLoading(false);
        return;
      }

      setReport(await res.json());
      setLoading(false);
    }
    load();
  }, [code, t]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted font-mono text-xs uppercase tracking-widest">{t("report.loading")}</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <p className="mb-4 text-danger">{error}</p>
        <Link href="/" className="text-primary hover:underline">{t("student.home")}</Link>
      </div>
    );
  }

  // 방어적 데이터 접근 (API 응답이 불완전할 수 있음)
  const stats = report.stats ?? { uniqueStudents: 0, totalResponses: 0, typeCounts: { understood: 0, confused: 0, lost: 0 }, timeline: [] };
  const questions = report.questions ?? { total: 0, clusters: [], unclustered: [] };
  const typeCounts = stats.typeCounts ?? { understood: 0, confused: 0, lost: 0 };
  const timeline = stats.timeline ?? [];

  const total = typeCounts.understood + typeCounts.confused + typeCounts.lost;
  const confusionRate =
    total > 0
      ? Math.round(((typeCounts.confused + typeCounts.lost) / total) * 100)
      : 0;

  const dateStr = formatDate(report.session?.createdAt ?? "").split(" ")[0];

  return (
    <div className="flex flex-col p-4 md:p-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <Link
            href={`/session/${code}/dashboard`}
            className="text-xs text-muted hover:text-foreground font-bold uppercase tracking-widest"
          >
            {t("report.back")}
          </Link>
          <h1 className="mt-4 text-2xl md:text-4xl font-black font-headline text-foreground uppercase tracking-tighter">
            {report.session.name}
          </h1>
          <p className="mt-1 text-[10px] text-muted font-mono uppercase tracking-widest">
            {dateStr} &middot; {code}
          </p>
        </div>

        {/* Materials */}
        {report.materials && report.materials.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 text-[10px] font-bold text-muted uppercase tracking-widest">{t("report.materials")}</h2>
            <div className="flex flex-col gap-1">
              {report.materials.map((m, i) => (
                <p key={i} className="text-sm text-foreground">📄 {m.fileName}</p>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {report.aiSummary && (
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-3xl" />
            <h2 className="mb-3 text-sm font-bold text-primary">{t("report.aiAnalysis")}</h2>
            <div className="max-w-none text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {report.aiSummary}
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="rounded-2xl border border-white/10 bg-surface-container p-5 text-center">
            <div className="text-3xl font-black text-white">{stats.uniqueStudents}</div>
            <div className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">{t("report.students")}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface-container p-5 text-center">
            <div className="text-3xl font-black text-white">{stats.totalResponses}</div>
            <div className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">{t("report.responses")}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface-container p-5 text-center">
            <div className={`text-3xl font-black ${confusionRate > 50 ? "text-danger" : confusionRate > 30 ? "text-warning" : "text-success"}`}>
              {confusionRate}%
            </div>
            <div className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">{t("report.confusion")}</div>
          </div>
        </div>

        {/* Understanding Distribution */}
        <div className="rounded-2xl border border-white/10 bg-surface-container p-6">
          <h2 className="mb-4 text-xs font-bold text-white/80 uppercase tracking-widest">
            {t("report.distribution")}
          </h2>
          <div className="flex flex-col gap-3">
            {[
              { label: t("student.understood"), emoji: "✅", count: typeCounts.understood, color: "bg-success" },
              { label: t("student.confused"), emoji: "🤔", count: typeCounts.confused, color: "bg-warning" },
              { label: t("student.lost"), emoji: "❌", count: typeCounts.lost, color: "bg-danger" },
            ].map((item) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-white">{item.emoji} {item.label}</span>
                  <div className="flex-1 h-6 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 text-right text-sm font-bold tabular-nums text-white/70">
                    {item.count}{t("chart.people")} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border border-white/10 bg-surface-container p-6">
          <h2 className="mb-1 text-xs font-bold text-white/80 uppercase tracking-widest">{t("report.timeline")}</h2>
          <p className="mb-4 text-[10px] text-white/50">{t("report.bucket")}</p>
          {timeline.length > 0 ? (
            <>
              <div className="mb-2 flex gap-3 text-[10px] text-white/60">
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-success" />{t("student.understood")}</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-warning" />{t("student.confused")}</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-danger" />{t("student.lost")}</span>
              </div>
              <TimelineChart timeline={timeline} />
            </>
          ) : (
            <p className="py-6 text-center text-xs text-white/40">데이터가 충분하지 않습니다</p>
          )}
        </div>

        {/* Questions */}
        <div className="rounded-2xl border border-white/10 bg-surface-container p-6">
          <h2 className="mb-4 text-xs font-bold text-white/80 uppercase tracking-widest">
            {t("report.questions")} ({questions.total})
          </h2>

          {questions.total === 0 ? (
            <p className="py-4 text-center text-xs text-white/40">질문이 없습니다</p>
          ) : (
            <>
              {questions.clusters.map((cluster, i) => (
                <div key={cluster.clusterId} className="mb-4 rounded-xl bg-white/5 p-4 border-l-2 border-primary">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      Group {i + 1}
                    </span>
                    <span className="text-[10px] text-white/50">{cluster.count}{t("chart.people")}</span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {cluster.questions.map((q, qi) => (
                      <li key={qi} className="text-sm text-white/90">&ldquo;{q}&rdquo;</li>
                    ))}
                  </ul>
                </div>
              ))}

              {questions.unclustered.length > 0 && (
                <div className="flex flex-col gap-2">
                  {questions.unclustered.map((q, i) => (
                    <div key={i} className="rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white/90">
                      &ldquo;{q}&rdquo;
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
