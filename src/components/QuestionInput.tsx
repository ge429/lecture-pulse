"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { getStudentId } from "@/lib/student";

export default function QuestionInput({ sessionId }: { sessionId: string }) {
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
