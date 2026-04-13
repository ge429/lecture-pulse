"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { POLL_INTERVAL, TOAST_DURATION, TOAST_FADE_OUT } from "@/lib/constants";
import { computeLatestStats } from "@/lib/stats";
import DonutChart from "@/components/DonutChart";
import StatBar from "@/components/StatBar";
import QuestionsPanel from "@/components/QuestionsPanel";
import PollPanel from "@/components/PollPanel";
import MaterialUpload from "@/components/MaterialUpload";
import { QRCodeSVG } from "qrcode.react";
import { useLocale } from "@/components/LocaleProvider";

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
  const { t } = useLocale();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [stats, setStats] = useState<Stats>({ understood: 0, confused: 0, lost: 0 });
  const [questions, setQuestions] = useState<{ id: string; text: string; cluster_id: number | null; created_at: string }[]>([]);
  const [clustering, setClustering] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [activePoll, setActivePoll] = useState<{ id: string; question: string; poll_type: string; options: string[]; is_open: boolean } | null>(null);
  const [pendingPolls, setPendingPolls] = useState<{ id: string; question: string; poll_type: string; options: string[] }[]>([]);
  const [pollResults, setPollResults] = useState<{ answer: string; count: number }[]>([]);
  const [materials, setMaterials] = useState<{ id: string; file_name: string; file_url: string; summary: string | null }[]>([]);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [copilot, setCopilot] = useState<{ suggestion: string; severity: "warning" | "critical"; suggestQuiz: boolean; quizTopic: string | null } | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const copilotCooldown = useRef<number>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [error, setError] = useState("");

  // ── 데이터 fetching ──────────────────────────────────────────────────────

  const fetchStats = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from("responses")
      .select("student_id, type, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (!data) return;
    setStats(computeLatestStats(data));
  }, []);

  const fetchMaterials = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from("materials")
      .select("id, file_name, file_url, summary")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    if (data) setMaterials(data);
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

  const fetchPendingPolls = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from("polls")
      .select("id, question, poll_type, options")
      .eq("session_id", sessionId)
      .eq("is_open", false)
      .order("created_at", { ascending: false });
    if (data) setPendingPolls(data);
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
    if (sessionId) fetchPendingPolls(sessionId);
  };

  const handleOpenPoll = async (pollId: string) => {
    // 기존 열린 투표 닫기
    if (activePoll?.is_open) {
      await supabase.from("polls").update({ is_open: false }).eq("id", activePoll.id);
    }
    await supabase.from("polls").update({ is_open: true }).eq("id", pollId);
    const { data } = await supabase
      .from("polls")
      .select("id, question, poll_type, options, is_open")
      .eq("id", pollId)
      .single();
    if (data) {
      setActivePoll(data);
      setPollResults([]);
    }
    if (sessionId) fetchPendingPolls(sessionId);
  };

  const handleGenerateQuiz = async (topic?: string) => {
    if (!sessionId || generatingQuiz) return;
    setGeneratingQuiz(true);
    const res = await fetch("/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, topic }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`🎯 퀴즈 ${data.count}개가 생성되었습니다!`);
      if (sessionId) fetchPendingPolls(sessionId);
    } else {
      alert(data.error || "퀴즈 생성 실패");
    }
    setGeneratingQuiz(false);
  };

  const triggerCopilot = useCallback(async () => {
    if (!sessionId || copilotLoading) return;
    const now = Date.now();
    if (now - copilotCooldown.current < 180_000) return; // 3분 쿨다운
    copilotCooldown.current = now;
    setCopilotLoading(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      setCopilot(data);
    } catch {
      setCopilot(null);
    }
    setCopilotLoading(false);
  }, [sessionId, copilotLoading]);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => setToast(null), TOAST_FADE_OUT);
    }, TOAST_DURATION);
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
      fetchMaterials(data.id);
      fetchPendingPolls(data.id);

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
  }, [code, fetchStats, fetchQuestions, fetchPollResults, fetchMaterials, fetchPendingPolls]);

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

    const interval = setInterval(() => {
      fetchStats(sessionId);
      fetchQuestions(sessionId);
    }, POLL_INTERVAL);

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
  const confusionRate = total > 0 ? (stats.confused + stats.lost) / total : 0;

  // AI 코파일럿 자동 트리거: 혼란도 40% 이상
  useEffect(() => {
    if (isActive && total > 0 && confusionRate >= 0.4) {
      triggerCopilot();
    }
  }, [stats, isActive, total, confusionRate, triggerCopilot]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-lg text-danger">{error}</p>
        <Link href="/" className="text-primary hover:underline">홈으로 돌아가기</Link>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted font-mono text-xs uppercase tracking-widest">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 z-50 rounded-2xl bg-primary px-8 py-4 shadow-2xl shadow-primary/25"
          style={{
            animation: toastVisible
              ? "toastIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards"
              : "toastOut 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
          }}
        >
          <p className="text-base font-bold text-background">{toast}</p>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1400px]">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-2xl md:text-4xl font-black font-headline text-foreground uppercase tracking-tighter">{sessionName}</h2>
            <div className="flex flex-wrap gap-2 md:gap-4 mt-2">
              <span className="flex items-center gap-1 text-[10px] bg-success/10 text-success px-2 py-0.5 rounded font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> {t("dash.live")}
              </span>
              <span className="text-[10px] bg-card text-muted px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-border">
                CODE: {code}
              </span>
              <span className="text-[10px] bg-card text-muted px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-border">
                {total}{t("chart.people")} {t("dash.participants")}
              </span>
            </div>
          </div>
          <div className="flex gap-2 md:gap-4">
            <Link href={`/session/${code}/report`} className="bg-card text-foreground px-4 md:px-6 py-2 rounded-full border border-border font-bold text-xs md:text-sm hover:border-primary/50 transition-all uppercase tracking-wider">
              {t("dash.report")}
            </Link>
            {isActive ? (
              <button onClick={handleEndSession} className="bg-danger text-white px-4 md:px-6 py-2 rounded-full font-bold text-xs md:text-sm hover:brightness-110 transition-all uppercase tracking-wider">
                {t("dash.endSession")}
              </button>
            ) : (
              <Link href="/" className="bg-muted/20 text-muted px-4 md:px-6 py-2 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider">
                {t("dash.ended")}
              </Link>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-8 space-y-4 md:space-y-6">
            {/* Understanding Distribution */}
            <div className="bg-card rounded-2xl p-6 md:p-8 border border-border">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg md:text-xl font-bold font-headline text-foreground">{t("dash.engagement")}</h3>
                  <p className="text-muted text-[10px] uppercase tracking-widest">{t("dash.biometrics")}</p>
                </div>
                <div className="hidden md:flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success" /> {t("student.understood")}</span>
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary" /> {t("student.confused")}</span>
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-danger" /> {t("student.lost")}</span>
                </div>
              </div>
              {total === 0 ? (
                <p className="py-12 text-center text-muted text-sm">{t("dash.noResponses")}</p>
              ) : (
                <>
                  <DonutChart stats={stats} />
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex flex-col gap-3">
                      <StatBar label={t("student.understood")} emoji="✅" count={stats.understood} total={total} color="bg-success" />
                      <StatBar label={t("student.confused")} emoji="🤔" count={stats.confused} total={total} color="bg-primary" />
                      <StatBar label={t("student.lost")} emoji="❌" count={stats.lost} total={total} color="bg-danger" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Materials */}
            {isActive && sessionId && (
              <MaterialUpload sessionId={sessionId} materials={materials} onUploaded={() => fetchMaterials(sessionId)} />
            )}

            {/* Poll */}
            {isActive && (
              <PollPanel activePoll={activePoll} pendingPolls={pendingPolls} pollResults={pollResults} onCreatePoll={handleCreatePoll} onClosePoll={handleClosePoll} onOpenPoll={handleOpenPoll} />
            )}

            {isActive && materials.length > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={() => handleGenerateQuiz()}
                  disabled={generatingQuiz}
                  className="rounded-xl bg-primary/10 px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/20 disabled:opacity-50 uppercase tracking-wider"
                >
                  {generatingQuiz ? t("dash.generating") : t("dash.generateQuiz")}
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-4 md:space-y-6">
            {/* AI Copilot */}
            <div className={`rounded-2xl p-5 md:p-6 border relative overflow-hidden ${
              copilot?.severity === "critical"
                ? "border-danger/30 bg-gradient-to-br from-danger/10 to-card"
                : "border-primary/20 bg-gradient-to-br from-primary/10 to-card"
            }`}>
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-3xl" />
              <div className="flex items-center gap-2 mb-4">
                <span className="text-primary">🤖</span>
                <h4 className="font-black text-foreground uppercase tracking-tight text-sm">{t("dash.copilot")}</h4>
                {copilotLoading && <span className="text-[10px] text-muted animate-pulse">분석 중...</span>}
              </div>
              {copilot ? (
                <div className="space-y-3">
                  <div className="bg-surface-dim/50 p-3 md:p-4 rounded-xl text-sm border-l-2 border-primary">
                    <p className="text-foreground leading-relaxed">{copilot.suggestion}</p>
                  </div>
                  {copilot.suggestQuiz && copilot.quizTopic && (
                    <button
                      onClick={() => handleGenerateQuiz(copilot.quizTopic!)}
                      disabled={generatingQuiz}
                      className="w-full bg-primary/10 hover:bg-primary/20 text-primary text-xs py-2 rounded-lg font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      {generatingQuiz ? "생성 중..." : `🎯 ${copilot.quizTopic} 퀴즈`}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-muted text-xs">{t("dash.copilotHint")}</p>
              )}
            </div>

            {/* Questions */}
            <QuestionsPanel questions={questions} clustering={clustering} onCluster={handleCluster} />

            {/* QR Code */}
            {isActive && (
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-4">{t("dash.accessCode")}</p>
                <div className="mb-4 flex justify-center">
                  <QRCodeSVG
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/session/${code}/student`}
                    size={140}
                    bgColor="transparent"
                    fgColor="#c9bfff"
                  />
                </div>
                <p className="text-2xl md:text-3xl font-mono font-black tracking-widest text-primary">{code}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
