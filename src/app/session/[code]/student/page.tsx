"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getStudentId } from "@/lib/student";
import { SIGNALS, SIGNAL_RESET_DELAY } from "@/lib/constants";
import type { ResponseType } from "@/lib/database.types";
import ActivePoll from "@/components/ActivePoll";
import QuestionInput from "@/components/QuestionInput";
import MaterialViewer from "@/components/MaterialViewer";

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

  useEffect(() => {
    if (!sessionId || ended) return;

    const channel = supabase
      .channel(`session-status-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
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
    setTimeout(() => setSelected(null), SIGNAL_RESET_DELAY);
  };

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="mb-4 text-lg text-danger">{error}</p>
        <Link href="/session/join" className="text-primary hover:underline">다시 참여하기</Link>
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
          <h1 className="mb-2 text-xl font-bold text-foreground">수업이 종료되었습니다</h1>
          <p className="mb-6 text-sm text-muted">수고하셨습니다! 오늘 수업은 여기까지입니다.</p>
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
          <Link href="/" className="text-sm text-muted hover:text-foreground">← 나가기</Link>
          <div className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-mono font-bold text-primary">{code}</div>
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
                selected === signal.id ? `ring-4 ${signal.ringColor} scale-[0.98]` : ""
              } ${lastSent === signal.id && selected === null ? "ring-2 ring-white/50" : ""}`}
            >
              <span className="text-3xl">{signal.emoji}</span>
              <span className="text-xl font-bold">{signal.label}</span>
              {selected === signal.id && (
                <span className="ml-auto text-sm font-medium opacity-80">전송됨!</span>
              )}
            </button>
          ))}
        </div>

        {lastSent && selected === null && (
          <p className="mt-6 text-center text-sm text-muted">
            마지막 응답: {SIGNALS.find((s) => s.id === lastSent)?.label} — 언제든 다시 보낼 수 있어요
          </p>
        )}

        <MaterialViewer sessionId={sessionId} />
        <ActivePoll sessionId={sessionId} />
        <QuestionInput sessionId={sessionId} />
      </div>
    </div>
  );
}
