"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getStudentId } from "@/lib/student";
import { getChoices, getAnswer } from "@/lib/poll-utils";

export default function ActivePoll({ sessionId }: { sessionId: string }) {
  const [poll, setPoll] = useState<{
    id: string;
    question: string;
    options: unknown;
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
          if (payload.new && payload.new.is_open === true) {
            setPoll({
              id: payload.new.id,
              question: payload.new.question,
              options: payload.new.options,
              is_open: true,
            });
            setVoted(null);
          } else if (payload.new && payload.new.is_open === false) {
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

  const choices = getChoices(poll.options);
  const correctAnswer = getAnswer(poll.options);
  const hasAnswered = voted !== null;
  const isCorrect = hasAnswered && correctAnswer && voted === correctAnswer;
  const isWrong = hasAnswered && correctAnswer && voted !== correctAnswer;

  return (
    <div className="mt-6 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
        퀴즈
      </h2>
      <p className="mb-4 font-medium text-foreground">{poll.question}</p>
      <div className="flex flex-col gap-2">
        {choices.map((opt) => {
          const isThisCorrect = hasAnswered && correctAnswer && opt === correctAnswer;
          const isThisMyWrong = hasAnswered && voted === opt && opt !== correctAnswer;

          return (
            <button
              key={opt}
              onClick={() => handleVote(opt)}
              disabled={hasAnswered}
              className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all active:scale-[0.98] ${
                isThisCorrect
                  ? "bg-success text-white ring-2 ring-success/30"
                  : isThisMyWrong
                    ? "bg-danger text-white ring-2 ring-danger/30"
                    : voted === opt
                      ? "bg-primary text-white ring-2 ring-primary/30"
                      : hasAnswered
                        ? "bg-border/30 text-muted"
                        : "bg-card border border-border text-foreground hover:border-primary"
              }`}
            >
              {opt}
              {isThisCorrect && <span className="ml-2 text-xs">✅ 정답</span>}
              {isThisMyWrong && <span className="ml-2 text-xs">❌</span>}
            </button>
          );
        })}
      </div>
      {hasAnswered && correctAnswer && (
        <div className={`mt-3 rounded-lg p-3 text-center text-sm font-semibold ${
          isCorrect ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
        }`}>
          {isCorrect ? "정답입니다! 🎉" : `오답입니다. 정답: ${correctAnswer}`}
        </div>
      )}
      {hasAnswered && !correctAnswer && (
        <p className="mt-3 text-center text-xs text-muted">응답이 제출되었습니다!</p>
      )}
    </div>
  );
}
