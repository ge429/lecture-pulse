"use client";

import { useState } from "react";
import { getChoices, getAnswer } from "@/lib/poll-utils";

interface Poll {
  id: string;
  question: string;
  poll_type: string;
  options: string[];
  is_open: boolean;
}

interface PendingPoll {
  id: string;
  question: string;
  poll_type: string;
  options: string[];
}

interface PollResult {
  answer: string;
  count: number;
}

export default function PollPanel({
  activePoll,
  pendingPolls,
  pollResults,
  onCreatePoll,
  onClosePoll,
  onOpenPoll,
}: {
  activePoll: Poll | null;
  pendingPolls: PendingPoll[];
  pollResults: PollResult[];
  onCreatePoll: (question: string, pollType: string, options: string[]) => void;
  onClosePoll: () => void;
  onOpenPoll: (pollId: string) => void;
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

      {/* 새 퀴즈 생성 폼 */}
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

      {/* 현재 진행 중인 퀴즈 */}
      {activePoll && (() => {
        const choices = getChoices(activePoll.options);
        const correctAnswer = getAnswer(activePoll.options);
        const correctCount = correctAnswer
          ? pollResults.find((r) => r.answer === correctAnswer)?.count ?? 0
          : null;
        const wrongCount = correctCount !== null ? totalVotes - correctCount : null;

        return (
          <div className="mb-4">
            <p className="mb-3 font-medium text-foreground">
              {activePoll.question}
            </p>
            <div className="flex flex-col gap-2">
              {choices.map((opt) => {
                const result = pollResults.find((r) => r.answer === opt);
                const count = result?.count ?? 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const isCorrectOpt = correctAnswer && opt === correctAnswer;
                const barColor = correctAnswer
                  ? isCorrectOpt ? "bg-success" : "bg-danger/60"
                  : "bg-primary";

                return (
                  <div key={opt} className="flex items-center gap-2 sm:gap-3">
                    <span className="w-10 sm:w-14 text-xs sm:text-sm font-bold truncate">
                      {isCorrectOpt && "✅ "}{opt}
                    </span>
                    <div className="flex-1 h-5 sm:h-7 rounded-full bg-border/50 overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-14 sm:w-16 text-right text-xs sm:text-sm font-bold tabular-nums">
                      {count}표 ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-3 text-xs text-muted">
                <span>총 {totalVotes}표</span>
                {correctCount !== null && totalVotes > 0 && (
                  <>
                    <span className="text-success font-semibold">정답 {correctCount}명</span>
                    <span className="text-danger font-semibold">오답 {wrongCount}명</span>
                  </>
                )}
              </div>
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
        );
      })()}

      {/* 대기 중인 퀴즈 목록 */}
      {pendingPolls.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-muted">
            대기 중 ({pendingPolls.length}개)
          </p>
          <div className="flex flex-col gap-2">
            {pendingPolls.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg bg-background px-4 py-2.5"
              >
                <div>
                  <span className="mr-2 text-xs text-muted">
                    {p.poll_type === "ox" ? "OX" : "객관식"}
                  </span>
                  <span className="text-sm text-foreground">{p.question}</span>
                </div>
                <button
                  onClick={() => onOpenPoll(p.id)}
                  disabled={activePoll?.is_open}
                  className="shrink-0 rounded-lg bg-success px-3 py-1 text-xs font-semibold text-white hover:bg-success/90 disabled:opacity-50"
                >
                  출제
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!activePoll && pendingPolls.length === 0 && !showForm && (
        <p className="py-4 text-center text-sm text-muted">
          퀴즈를 만들어 학생들의 이해도를 확인해보세요.
        </p>
      )}
    </div>
  );
}
