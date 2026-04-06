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
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase
        .from("sessions")
        .select("id")
        .eq("code", code)
        .eq("is_active", true)
        .single();

      if (data) {
        setSessionId(data.id);
      } else {
        setError("존재하지 않거나 종료된 수업입니다.");
      }
    }
    loadSession();
  }, [code]);

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
              className={`flex items-center gap-4 rounded-2xl ${signal.color} px-6 py-5 text-white transition-all ${signal.hoverColor} disabled:opacity-70 ${
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

        {/* 질문 입력 */}
        <QuestionInput sessionId={sessionId} />
      </div>
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
