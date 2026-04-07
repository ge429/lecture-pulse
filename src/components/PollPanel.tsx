"use client";

import { useState } from "react";

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

export default function PollPanel({
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
