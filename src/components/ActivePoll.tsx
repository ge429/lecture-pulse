"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getStudentId } from "@/lib/student";

export default function ActivePoll({ sessionId }: { sessionId: string }) {
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

    const channel = supabase
      .channel(`polls-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "polls", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setPoll(payload.new as typeof poll);
          setVoted(null);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "polls", filter: `session_id=eq.${sessionId}` },
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
