"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { ResponseType } from "@/lib/database.types";
import DonutChart from "@/components/DonutChart";
import StatBar from "@/components/StatBar";
import QuestionsPanel from "@/components/QuestionsPanel";
import PollPanel from "@/components/PollPanel";

interface Stats {
  understood: number;
  confused: number;
  lost: number;
}

export default function DashboardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [stats, setStats] = useState<Stats>({ understood: 0, confused: 0, lost: 0 });
  const [questions, setQuestions] = useState<{ id: string; text: string; cluster_id: number | null; created_at: string }[]>([]);
  const [clustering, setClustering] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [activePoll, setActivePoll] = useState<{ id: string; question: string; poll_type: string; options: string[]; is_open: boolean } | null>(null);
  const [pollResults, setPollResults] = useState<{ answer: string; count: number }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [error, setError] = useState("");

  // ── 데이터 fetching ──────────────────────────────────────────────────────

  const fetchStats = useCallback(async (sessionId: string) => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from("responses")
      .select("student_id, type, created_at")
      .eq("session_id", sessionId)
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
  }, []);

  const fetchQuestions = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from("questions")
      .select("id, text, cluster_id, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setQuestions(data);
  }, []);

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

  // ── 액션 핸들러 ──────────────────────────────────────────────────────────

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
    await supabase.from("sessions").update({ is_active: false }).eq("id", sessionId);
    setIsActive(false);
  };

  const handleCreatePoll = async (question: string, pollType: string, options: string[]) => {
    if (!sessionId) return;
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

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => setToast(null), 400);
    }, 2600);
  };

  // ── 초기 로드 ────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase
        .from("sessions")
        .select("id, name, is_active")
        .eq("code", code)
        .single();

      if (!data) {
        setError("존재하지 않는 수업입니다.");
        return;
      }

      setSessionId(data.id);
      setSessionName(data.name);
      setIsActive(data.is_active);
      fetchStats(data.id);
      fetchQuestions(data.id);

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
    }
    loadSession();
  }, [code, fetchStats, fetchQuestions, fetchPollResults]);

  // ── Realtime 구독 ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId) return;

    const responsesChannel = supabase
      .channel(`responses-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "responses", filter: `session_id=eq.${sessionId}` }, () => fetchStats(sessionId))
      .subscribe();

    const questionsChannel = supabase
      .channel(`questions-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "questions", filter: `session_id=eq.${sessionId}` }, () => {
        fetchQuestions(sessionId);
        showToast("💬 새로운 질문이 들어왔습니다!");
      })
      .subscribe();

    const interval = setInterval(() => fetchStats(sessionId), 30000);

    return () => {
      supabase.removeChannel(responsesChannel);
      supabase.removeChannel(questionsChannel);
      clearInterval(interval);
    };
  }, [sessionId, fetchStats, fetchQuestions]);

  useEffect(() => {
    if (!activePoll?.id || !activePoll.is_open) return;

    const channel = supabase
      .channel(`poll-votes-${activePoll.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "poll_votes", filter: `poll_id=eq.${activePoll.id}` }, () => fetchPollResults(activePoll.id))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePoll?.id, activePoll?.is_open, fetchPollResults]);

  // ── 렌더링 ───────────────────────────────────────────────────────────────

  const total = stats.understood + stats.confused + stats.lost;

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="mb-4 text-lg text-danger">{error}</p>
        <Link href="/" className="text-primary hover:underline">홈으로 돌아가기</Link>
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
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm text-muted hover:text-foreground">← 종료</Link>
          <h1 className="text-lg font-bold">{sessionName}</h1>
          <div className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-mono font-bold text-primary">{code}</div>
        </div>

        <div className="mb-4 rounded-2xl border border-border bg-card p-6">
          <div className="mb-1 text-sm text-muted">최근 5분 참여</div>
          <div className="text-3xl font-bold">
            {total}<span className="ml-1 text-base font-normal text-muted">명</span>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-muted uppercase tracking-wide">이해도 분포</h2>
          {total === 0 ? (
            <p className="py-8 text-center text-muted text-sm">아직 응답이 없습니다. 학생들이 참여하면 여기에 표시됩니다.</p>
          ) : (
            <DonutChart stats={stats} />
          )}
        </div>

        {total > 0 && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-sm font-semibold text-muted uppercase tracking-wide">실시간 이해도</h2>
            <div className="flex flex-col gap-4">
              <StatBar label="이해됨" emoji="✅" count={stats.understood} total={total} color="bg-success" />
              <StatBar label="헷갈림" emoji="🤔" count={stats.confused} total={total} color="bg-warning" />
              <StatBar label="모르겠음" emoji="❌" count={stats.lost} total={total} color="bg-danger" />
            </div>
          </div>
        )}

        {isActive && (
          <PollPanel
            activePoll={activePoll}
            pollResults={pollResults}
            onCreatePoll={handleCreatePoll}
            onClosePoll={handleClosePoll}
          />
        )}

        <QuestionsPanel questions={questions} clustering={clustering} onCluster={handleCluster} />

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
