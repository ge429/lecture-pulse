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
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-3">Signal Queue</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="질문을 입력하세요"
          className="flex-1 rounded-xl bg-surface-dim border-none px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:ring-1 focus:ring-primary focus:outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-background transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
        >
          {sending ? "..." : sent ? "✓" : "Send"}
        </button>
      </form>
      {sent && (
        <p className="mt-2 text-[10px] text-success font-mono uppercase tracking-widest">Signal_Transmitted</p>
      )}
    </div>
  );
}
