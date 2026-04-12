"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import ReactMarkdown from "react-markdown";

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

// ── 타임라인 바 차트 ──────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      // 세션 ID 조회
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
        setError("리포트 생성에 실패했습니다.");
        setLoading(false);
        return;
      }

      setReport(await res.json());
      setLoading(false);
    }
    load();
  }, [code]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted">리포트 생성 중...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <p className="mb-4 text-danger">{error}</p>
        <Link href="/" className="text-primary hover:underline">
          홈으로
        </Link>
      </div>
    );
  }

  const { stats, questions } = report;
  const total =
    stats.typeCounts.understood +
    stats.typeCounts.confused +
    stats.typeCounts.lost;
  const confusionRate =
    total > 0
      ? Math.round(
          ((stats.typeCounts.confused + stats.typeCounts.lost) / total) * 100
        )
      : 0;

  const dateStr = formatDate(report.session.createdAt).split(" ")[0];

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href={`/session/${code}/dashboard`}
            className="mb-4 inline-flex text-sm text-muted hover:text-foreground"
          >
            ← 대시보드로
          </Link>
          <h1 className="text-2xl font-bold">{report.session.name}</h1>
          <p className="text-sm text-muted">
            {dateStr} &middot; 코드: {code}
          </p>
        </div>

        {/* 수업 자료 */}
        {report.materials && report.materials.length > 0 && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 text-sm font-semibold text-muted uppercase tracking-wide">📚 수업 자료</h2>
            <div className="flex flex-col gap-1">
              {report.materials.map((m, i) => (
                <p key={i} className="text-sm text-foreground">📄 {m.fileName}</p>
              ))}
            </div>
          </div>
        )}

        {/* AI 요약 */}
        {report.aiSummary && (
          <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <span>🤖</span> AI 수업 분석
            </h2>
            <div className="prose prose-sm max-w-none text-foreground">
              <ReactMarkdown>{report.aiSummary}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* 핵심 지표 */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold">{stats.uniqueStudents}</div>
            <div className="text-xs text-muted">참여 학생</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold">{stats.totalResponses}</div>
            <div className="text-xs text-muted">총 응답</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div
              className={`text-2xl font-bold ${confusionRate > 50 ? "text-danger" : confusionRate > 30 ? "text-warning" : "text-success"}`}
            >
              {confusionRate}%
            </div>
            <div className="text-xs text-muted">혼란도</div>
          </div>
        </div>

        {/* 이해도 분포 */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-muted uppercase tracking-wide">
            이해도 분포
          </h2>
          <div className="flex flex-col gap-3">
            {[
              {
                label: "이해됨",
                emoji: "✅",
                count: stats.typeCounts.understood,
                color: "bg-success",
              },
              {
                label: "헷갈림",
                emoji: "🤔",
                count: stats.typeCounts.confused,
                color: "bg-warning",
              },
              {
                label: "모르겠음",
                emoji: "❌",
                count: stats.typeCounts.lost,
                color: "bg-danger",
              },
            ].map((item) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-20 text-sm">
                    {item.emoji} {item.label}
                  </span>
                  <div className="flex-1 h-6 rounded-full bg-border/50 overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-sm font-bold tabular-nums">
                    {item.count}건 ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 시간대별 추이 */}
        {stats.timeline.length > 0 && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-1 text-sm font-semibold text-muted uppercase tracking-wide">
              시간대별 추이
            </h2>
            <p className="mb-4 text-xs text-muted">5분 단위 집계</p>
            <div className="mb-2 flex gap-3 text-xs text-muted">
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-success" />
                이해됨
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-warning" />
                헷갈림
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-danger" />
                모르겠음
              </span>
            </div>
            <TimelineChart timeline={stats.timeline} />
          </div>
        )}

        {/* 질문 요약 */}
        {questions.total > 0 && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-sm font-semibold text-muted uppercase tracking-wide">
              학생 질문 ({questions.total}건)
            </h2>

            {questions.clusters.map((cluster, i) => (
              <div key={cluster.clusterId} className="mb-4 rounded-xl bg-background p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    그룹 {i + 1}
                  </span>
                  <span className="text-xs text-muted">
                    {cluster.count}명이 비슷한 질문
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {cluster.questions.map((q, qi) => (
                    <li key={qi} className="text-sm">
                      &ldquo;{q}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {questions.unclustered.length > 0 && (
              <div>
                {questions.clusters.length > 0 && (
                  <p className="mb-2 text-xs text-muted">기타 질문</p>
                )}
                <ul className="flex flex-col gap-2">
                  {questions.unclustered.map((q, i) => (
                    <li
                      key={i}
                      className="rounded-lg bg-background px-4 py-2 text-sm"
                    >
                      &ldquo;{q}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
