"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getStudentId } from "@/lib/student";
import type { ResponseType } from "@/lib/database.types";

const SIGNALS = [
  {
    id: "understood" as ResponseType,
    emoji: "\u2705",
    label: "이해됨",
    color: "bg-success",
    hoverColor: "hover:bg-success/90",
    ringColor: "ring-success/30",
  },
  {
    id: "confused" as ResponseType,
    emoji: "\uD83E\uDD14",
    label: "헷갈림",
    color: "bg-warning",
    hoverColor: "hover:bg-warning/90",
    ringColor: "ring-warning/30",
  },
  {
    id: "lost" as ResponseType,
    emoji: "\u274C",
    label: "모르겠음",
    color: "bg-danger",
    hoverColor: "hover:bg-danger/90",
    ringColor: "ring-danger/30",
  },
];

export default function StudentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase
        .from("sessions")
        .select("id, is_active")
        .eq("code", code)
        .single();

      if (data) {
        setSessionId(data.id);
        if (!data.is_active) setEnded(true);
      } else {
        setError("존재하지 않는 수업입니다.");
      }
    }
    loadSession();
  }, [code]);

  // 수업 종료 Realtime 감지
  useEffect(() => {
    if (!sessionId || ended) return;

    const channel = supabase
      .channel(`session-status-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new && payload.new.is_active === false) {
            setEnded(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, ended]);

  const handleSignal = async (signalId: ResponseType) => {
    if (!sessionId) return;
    setSelected(signalId);

    const { error: dbError } = await supabase.from("responses").insert({
      session_id: sessionId,
      student_id: getStudentId(),
      type: signalId,
    });

    if (dbError) {
      setError("전송에 실패했습니다. 다시 시도해주세요.");
      setSelected(null);
      return;
    }

    setLastSent(signalId);
    setTimeout(() => setSelected(null), 1500);
  };

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="mb-4 text-lg text-danger">{error}</p>
        <Link href="/session/join" className="text-primary hover:underline">
          다시 참여하기
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

  if (ended) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
          <div className="mb-4 text-4xl">📚</div>
          <h1 className="mb-2 text-xl font-bold text-foreground">
            수업이 종료되었습니다
          </h1>
          <p className="mb-6 text-sm text-muted">
            수고하셨습니다! 오늘 수업은 여기까지입니다.
          </p>
          <Link
            href="/"
            className="inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground"
          >
            ← 나가기
          </Link>
          <div className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-mono font-bold text-primary">
            {code}
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="mb-1 text-xl font-bold">수업 진행 중</h1>
          <p className="text-sm text-muted">현재 이해도를 선택해주세요</p>
        </div>

        <div className="flex flex-col gap-4">
          {SIGNALS.map((signal) => (
            <button
              key={signal.id}
              onClick={() => handleSignal(signal.id)}
              disabled={selected !== null}
              className={`flex items-center gap-4 rounded-2xl ${signal.color} px-6 py-6 min-h-[72px] text-white transition-all active:scale-[0.97] ${signal.hoverColor} disabled:opacity-70 ${
                selected === signal.id
                  ? `ring-4 ${signal.ringColor} scale-[0.98]`
                  : ""
              } ${
                lastSent === signal.id && selected === null
                  ? "ring-2 ring-white/50"
                  : ""
              }`}
            >
              <span className="text-3xl">{signal.emoji}</span>
              <span className="text-xl font-bold">{signal.label}</span>
              {selected === signal.id && (
                <span className="ml-auto text-sm font-medium opacity-80">
                  전송됨!
                </span>
              )}
            </button>
          ))}
        </div>

        {lastSent && selected === null && (
          <p className="mt-6 text-center text-sm text-muted">
            마지막 응답:{" "}
            {SIGNALS.find((s) => s.id === lastSent)?.label} — 언제든 다시
            보낼 수 있어요
          </p>
        )}

        {/* 퀴즈/투표 */}
        <ActivePoll sessionId={sessionId} />

        {/* 질문 입력 */}
        <QuestionInput sessionId={sessionId} />
      </div>
    </div>
  );
}

// ── 퀴즈/투표 컴포넌트 ────────────────────────────────────────────────────────

function ActivePoll({ sessionId }: { sessionId: string }) {
  const [poll, setPoll] = useState<{
    id: string;
    question: string;
    options: string[];
    is_open: boolean;
  } | null>(null);
  const [voted, setVoted] = useState<string | null>(null);

  useEffect(() => {
    async function loadPoll() {
      const { data } = await supabase
        .from("polls")
        .select("id, question, options, is_open")
        .eq("session_id", sessionId)
        .eq("is_open", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setPoll(data);
        // 이미 투표했는지 확인
        const { data: existing } = await supabase
          .from("poll_votes")
          .select("answer")
          .eq("poll_id", data.id)
          .eq("student_id", getStudentId())
          .single();
        if (existing) setVoted(existing.answer);
      }
    }
    loadPoll();

    // 새 퀴즈 Realtime 감지
    const channel = supabase
      .channel(`polls-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "polls",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setPoll(payload.new as typeof poll);
          setVoted(null);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "polls",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new && payload.new.is_open === false) {
            setPoll((prev) => (prev ? { ...prev, is_open: false } : null));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handleVote = async (answer: string) => {
    if (!poll || voted) return;
    setVoted(answer);
    await supabase.from("poll_votes").insert({
      poll_id: poll.id,
      student_id: getStudentId(),
      answer,
    });
  };

  if (!poll || !poll.is_open) return null;

  return (
    <div className="mt-6 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
        퀴즈
      </h2>
      <p className="mb-4 font-medium text-foreground">{poll.question}</p>
      <div className="flex flex-col gap-2">
        {(poll.options as string[]).map((opt) => (
          <button
            key={opt}
            onClick={() => handleVote(opt)}
            disabled={voted !== null}
            className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all active:scale-[0.98] ${
              voted === opt
                ? "bg-primary text-white ring-2 ring-primary/30"
                : voted
                  ? "bg-border/30 text-muted"
                  : "bg-card border border-border text-foreground hover:border-primary"
            }`}
          >
            {opt}
            {voted === opt && (
              <span className="ml-2 text-xs opacity-80">✓ 선택됨</span>
            )}
          </button>
        ))}
      </div>
      {voted && (
        <p className="mt-3 text-center text-xs text-muted">
          응답이 제출되었습니다!
        </p>
      )}
    </div>
  );
}

// ── 질문 입력 컴포넌트 ─────────────────────────────────────────────────────────

function QuestionInput({ sessionId }: { sessionId: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);

    const { error } = await supabase.from("questions").insert({
      session_id: sessionId,
      student_id: getStudentId(),
      text: text.trim(),
    });

    setSending(false);

    if (!error) {
      setText("");
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        💬 질문하기
      </h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="이해가 안 되는 부분을 질문해보세요"
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? "..." : sent ? "✓" : "전송"}
        </button>
      </form>
      {sent && (
        <p className="mt-2 text-xs text-success">질문이 전송되었습니다!</p>
      )}
    </div>
  );
}
