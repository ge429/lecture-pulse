"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { ResponseType } from "@/lib/database.types";

interface Question {
  id: string;
  text: string;
  cluster_id: number | null;
  created_at: string;
}

interface Poll {
  id: string;
  question: string;
  poll_type: string;
  options: string[];
  is_open: boolean;
}

interface PollResult {
  answer: string;
  count: number;
}

interface Stats {
  understood: number;
  confused: number;
  lost: number;
}

// ── SVG helpers ────────────────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlice(
  cx: number,
  cy: number,
  ro: number,
  ri: number,
  start: number,
  end: number
) {
  if (end - start >= 360) end = start + 359.99;
  const large = end - start > 180 ? 1 : 0;
  const os = polar(cx, cy, ro, start);
  const oe = polar(cx, cy, ro, end);
  const ie = polar(cx, cy, ri, end);
  const is_ = polar(cx, cy, ri, start);
  return (
    `M ${os.x.toFixed(2)} ${os.y.toFixed(2)} ` +
    `A ${ro} ${ro} 0 ${large} 1 ${oe.x.toFixed(2)} ${oe.y.toFixed(2)} ` +
    `L ${ie.x.toFixed(2)} ${ie.y.toFixed(2)} ` +
    `A ${ri} ${ri} 0 ${large} 0 ${is_.x.toFixed(2)} ${is_.y.toFixed(2)} Z`
  );
}

// ── DonutChart ────────────────────────────────────────────────────────────────

function DonutChart({ stats }: { stats: Stats }) {
  const total = stats.understood + stats.confused + stats.lost;
  const cx = 80, cy = 80, ro = 68, ri = 44;

  const segments: { value: number; color: string; label: string }[] = [
    { value: stats.understood, color: "#22c55e", label: "이해됨" },
    { value: stats.confused,   color: "#f59e0b", label: "헷갈림" },
    { value: stats.lost,       color: "#ef4444", label: "모르겠음" },
  ];

  let cursor = 0;
  const slices = segments.map((seg) => {
    const sweep = total > 0 ? (seg.value / total) * 360 : 0;
    const start = cursor;
    cursor += sweep;
    return { ...seg, start, sweep };
  });

  // confusion rate for center label
  const confusionPct =
    total > 0 ? Math.round(((stats.confused + stats.lost) / total) * 100) : 0;

  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={ro} fill="none" stroke="#e2e8f0" strokeWidth={ri - 4} />
        ) : (
          slices.map((s, i) =>
            s.sweep > 0 ? (
              <path
                key={i}
                d={donutSlice(cx, cy, ro, ri, s.start, s.start + s.sweep)}
                fill={s.color}
                className="transition-all duration-500"
              />
            ) : null
          )
        )}
        {/* center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">
          {total > 0 ? `${confusionPct}%` : "—"}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#64748b">
          혼란도
        </text>
      </svg>

      {/* legend */}
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
              <span className="font-bold tabular-nums">
                {seg.value}명
              </span>
              <span className="text-muted tabular-nums text-xs">({pct}%)</span>
            </div>
          );
        })}
        <div className="pt-1 border-t border-border text-muted text-xs">
          합계 {total}명
        </div>
      </div>
    </div>
  );
}

// ── StatBar ───────────────────────────────────────────────────────────────────

function StatBar({
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [stats, setStats] = useState<Stats>({ understood: 0, confused: 0, lost: 0 });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [clustering, setClustering] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [pollResults, setPollResults] = useState<PollResult[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [error, setError] = useState("");

  const fetchStats = useCallback(
    async (sid: string) => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from("responses")
        .select("student_id, type, created_at")
        .eq("session_id", sid)
        .gte("created_at", fiveMinAgo)
        .order("created_at", { ascending: false });

      if (!data) return;

      const latestByStudent = new Map<string, ResponseType>();
      for (const row of data) {
        if (!latestByStudent.has(row.student_id)) {
          latestByStudent.set(row.student_id, row.type);
        }
      }

      const counts: Stats = { understood: 0, confused: 0, lost: 0 };
      for (const type of latestByStudent.values()) {
        counts[type]++;
      }
      setStats(counts);
    },
    []
  );

  const fetchQuestions = useCallback(async (sid: string) => {
    const { data } = await supabase
      .from("questions")
      .select("id, text, cluster_id, created_at")
      .eq("session_id", sid)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setQuestions(data);
  }, []);

  const handleCluster = async () => {
    if (!sessionId || clustering) return;
    setClustering(true);
    await fetch("/api/cluster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    await fetchQuestions(sessionId);
    setClustering(false);
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    await supabase
      .from("sessions")
      .update({ is_active: false })
      .eq("id", sessionId);
    setIsActive(false);
  };

  const fetchPollResults = useCallback(async (pollId: string) => {
    const { data } = await supabase
      .from("poll_votes")
      .select("answer")
      .eq("poll_id", pollId);
    if (!data) return;
    const counts = new Map<string, number>();
    for (const v of data) {
      counts.set(v.answer, (counts.get(v.answer) ?? 0) + 1);
    }
    setPollResults(
      [...counts.entries()].map(([answer, count]) => ({ answer, count }))
    );
  }, []);

  const handleCreatePoll = async (question: string, pollType: string, options: string[]) => {
    if (!sessionId) return;
    // 기존 열린 투표 닫기
    if (activePoll) {
      await supabase.from("polls").update({ is_open: false }).eq("id", activePoll.id);
    }
    const { data } = await supabase
      .from("polls")
      .insert({ session_id: sessionId, question, poll_type: pollType, options })
      .select()
      .single();
    if (data) {
      setActivePoll(data);
      setPollResults([]);
    }
  };

  const handleClosePoll = async () => {
    if (!activePoll) return;
    await supabase.from("polls").update({ is_open: false }).eq("id", activePoll.id);
    setActivePoll({ ...activePoll, is_open: false });
  };

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase
        .from("sessions")
        .select("id, name, is_active")
        .eq("code", code)
        .single();

      if (data) {
        setSessionId(data.id);
        setSessionName(data.name);
        setIsActive(data.is_active);
        fetchStats(data.id);
        fetchQuestions(data.id);
        // 열린 투표 로드
        const { data: poll } = await supabase
          .from("polls")
          .select("id, question, poll_type, options, is_open")
          .eq("session_id", data.id)
          .eq("is_open", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (poll) {
          setActivePoll(poll);
          fetchPollResults(poll.id);
        }
      } else {
        setError("존재하지 않는 수업입니다.");
      }
    }
    loadSession();
  }, [code, fetchStats, fetchQuestions]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`responses-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "responses",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchStats(sessionId);
        }
      )
      .subscribe();

    const qChannel = supabase
      .channel(`questions-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "questions",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchQuestions(sessionId);
          // 이전 타이머 정리
          if (toastTimer.current) clearTimeout(toastTimer.current);
          setToast("💬 새로운 질문이 들어왔습니다!");
          setToastVisible(true);
          toastTimer.current = setTimeout(() => {
            setToastVisible(false);
            setTimeout(() => setToast(null), 400);
          }, 2600);
        }
      )
      .subscribe();

    const interval = setInterval(() => fetchStats(sessionId), 30000);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(qChannel);
      clearInterval(interval);
    };
  }, [sessionId, fetchStats, fetchQuestions]);

  // 투표 결과 Realtime
  useEffect(() => {
    if (!activePoll?.id || !activePoll.is_open) return;

    const channel = supabase
      .channel(`poll-votes-${activePoll.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "poll_votes",
          filter: `poll_id=eq.${activePoll.id}`,
        },
        () => {
          fetchPollResults(activePoll.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePoll?.id, activePoll?.is_open, fetchPollResults]);

  const total = stats.understood + stats.confused + stats.lost;

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="mb-4 text-lg text-danger">{error}</p>
        <Link href="/" className="text-primary hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted">수업 연결 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 pt-8 pb-12">
      {/* 토스트 알림 */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 z-50 rounded-2xl bg-primary px-8 py-4 shadow-2xl shadow-primary/25"
          style={{
            animation: toastVisible
              ? "toastIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards"
              : "toastOut 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
          }}
        >
          <p className="text-base font-bold text-white">{toast}</p>
        </div>
      )}

      <div className="mx-auto w-full max-w-2xl">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← 종료
          </Link>
          <h1 className="text-lg font-bold">{sessionName}</h1>
          <div className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-mono font-bold text-primary">
            {code}
          </div>
        </div>

        {/* 참여 현황 */}
        <div className="mb-4 rounded-2xl border border-border bg-card p-6">
          <div className="mb-1 text-sm text-muted">최근 5분 참여</div>
          <div className="text-3xl font-bold">
            {total}
            <span className="ml-1 text-base font-normal text-muted">명</span>
          </div>
        </div>

        {/* 도넛 차트 */}
        <div className="mb-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-muted uppercase tracking-wide">
            이해도 분포
          </h2>
          {total === 0 ? (
            <p className="py-8 text-center text-muted text-sm">
              아직 응답이 없습니다. 학생들이 참여하면 여기에 표시됩니다.
            </p>
          ) : (
            <DonutChart stats={stats} />
          )}
        </div>

        {/* 막대 상세 */}
        {total > 0 && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-sm font-semibold text-muted uppercase tracking-wide">
              실시간 이해도
            </h2>
            <div className="flex flex-col gap-4">
              <StatBar label="이해됨" emoji="✅" count={stats.understood} total={total} color="bg-success" />
              <StatBar label="헷갈림" emoji="🤔" count={stats.confused}   total={total} color="bg-warning" />
              <StatBar label="모르겠음" emoji="❌" count={stats.lost}       total={total} color="bg-danger"  />
            </div>
          </div>
        )}

        {/* 퀴즈/투표 */}
        {isActive && (
          <PollPanel
            activePoll={activePoll}
            pollResults={pollResults}
            onCreatePoll={handleCreatePoll}
            onClosePoll={handleClosePoll}
          />
        )}

        {/* 질문 패널 */}
        <QuestionsPanel
          questions={questions}
          clustering={clustering}
          onCluster={handleCluster}
        />

        {/* 수업 종료 / 리포트 */}
        <div className="mb-6 flex gap-3">
          {isActive ? (
            <button
              onClick={handleEndSession}
              className="flex-1 rounded-xl border-2 border-danger px-4 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/5"
            >
              수업 종료하기
            </button>
          ) : (
            <div className="flex-1 rounded-xl bg-muted/10 px-4 py-3 text-center text-sm text-muted">
              수업이 종료되었습니다
            </div>
          )}
          <Link
            href={`/session/${code}/report`}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            📊 리포트 보기
          </Link>
        </div>

        {/* 수업 코드 공유 */}
        {isActive && (
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
            <p className="mb-2 text-sm text-muted">학생들에게 아래 코드를 공유하세요</p>
            <p className="text-4xl font-mono font-bold tracking-widest text-primary">{code}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── QuestionsPanel ────────────────────────────────────────────────────────────

const CLUSTER_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
  "bg-cyan-100 text-cyan-800",
];

function QuestionsPanel({
  questions,
  clustering,
  onCluster,
}: {
  questions: Question[];
  clustering: boolean;
  onCluster: () => void;
}) {
  const unclustered = questions.filter((q) => q.cluster_id === null);
  const clustered = questions.filter((q) => q.cluster_id !== null);

  // 군집별 그룹
  const groups = useMemo(() => {
    const map = new Map<number, Question[]>();
    for (const q of clustered) {
      const arr = map.get(q.cluster_id!) ?? [];
      arr.push(q);
      map.set(q.cluster_id!, arr);
    }
    // 질문 수 많은 군집이 위로
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [clustered]);

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
          학생 질문 ({questions.length})
        </h2>
        {unclustered.length >= 2 && (
          <button
            onClick={onCluster}
            disabled={clustering}
            className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            {clustering ? "분석 중..." : "🤖 질문 군집화"}
          </button>
        )}
      </div>

      {questions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          아직 질문이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 군집된 질문 */}
          {groups.map(([clusterId, qs], gi) => (
            <div key={clusterId} className="rounded-xl bg-background p-4">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${CLUSTER_COLORS[gi % CLUSTER_COLORS.length]}`}
                >
                  그룹 {gi + 1}
                </span>
                <span className="text-xs text-muted">{qs.length}명이 비슷한 질문</span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {qs.map((q) => (
                  <li key={q.id} className="text-sm text-foreground">
                    &ldquo;{q.text}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* 미군집 질문 */}
          {unclustered.length > 0 && (
            <div>
              {groups.length > 0 && (
                <p className="mb-2 text-xs text-muted">미분류</p>
              )}
              <ul className="flex flex-col gap-2">
                {unclustered.map((q) => (
                  <li
                    key={q.id}
                    className="rounded-lg bg-background px-4 py-2.5 text-sm text-foreground"
                  >
                    &ldquo;{q.text}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PollPanel ─────────────────────────────────────────────────────────────────

function PollPanel({
  activePoll,
  pollResults,
  onCreatePoll,
  onClosePoll,
}: {
  activePoll: Poll | null;
  pollResults: PollResult[];
  onCreatePoll: (question: string, pollType: string, options: string[]) => void;
  onClosePoll: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollType, setPollType] = useState<"ox" | "choice">("ox");
  const [choiceOptions, setChoiceOptions] = useState(["", "", "", ""]);

  const handleSubmit = () => {
    if (!pollQuestion.trim()) return;
    const options =
      pollType === "ox"
        ? ["O", "X"]
        : choiceOptions.filter((o) => o.trim() !== "").map((o) => o.trim());
    if (pollType === "choice" && options.length < 2) return;
    onCreatePoll(pollQuestion.trim(), pollType, options);
    setPollQuestion("");
    setChoiceOptions(["", "", "", ""]);
    setShowForm(false);
  };

  const totalVotes = pollResults.reduce((s, r) => s + r.count, 0);

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
          퀴즈 / 투표
        </h2>
        {!activePoll?.is_open && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
          >
            {showForm ? "취소" : "+ 새 퀴즈"}
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl bg-background p-4">
          <input
            type="text"
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="질문을 입력하세요"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setPollType("ox")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${pollType === "ox" ? "bg-primary text-white" : "bg-border/50 text-muted"}`}
            >
              O / X
            </button>
            <button
              onClick={() => setPollType("choice")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${pollType === "choice" ? "bg-primary text-white" : "bg-border/50 text-muted"}`}
            >
              객관식
            </button>
          </div>
          {pollType === "choice" && (
            <div className="flex flex-col gap-2">
              {choiceOptions.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...choiceOptions];
                    next[i] = e.target.value;
                    setChoiceOptions(next);
                  }}
                  placeholder={`보기 ${i + 1}`}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
              ))}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!pollQuestion.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            퀴즈 보내기
          </button>
        </div>
      )}

      {activePoll && (
        <div>
          <p className="mb-3 font-medium text-foreground">
            {activePoll.question}
          </p>
          <div className="flex flex-col gap-2">
            {(activePoll.options as string[]).map((opt) => {
              const result = pollResults.find((r) => r.answer === opt);
              const count = result?.count ?? 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              return (
                <div key={opt} className="flex items-center gap-3">
                  <span className="w-12 text-sm font-bold">{opt}</span>
                  <div className="flex-1 h-7 rounded-full bg-border/50 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-bold tabular-nums">
                    {count}표 ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted">총 {totalVotes}표</span>
            {activePoll.is_open ? (
              <button
                onClick={onClosePoll}
                className="rounded-lg border border-danger px-3 py-1 text-xs font-semibold text-danger hover:bg-danger/5"
              >
                투표 종료
              </button>
            ) : (
              <span className="text-xs font-semibold text-muted">종료됨</span>
            )}
          </div>
        </div>
      )}

      {!activePoll && !showForm && (
        <p className="py-4 text-center text-sm text-muted">
          퀴즈를 만들어 학생들의 이해도를 확인해보세요.
        </p>
      )}
    </div>
  );
}
