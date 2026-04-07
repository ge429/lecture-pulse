"use client";

import { useMemo } from "react";
import { CLUSTER_COLORS } from "@/lib/constants";

interface Question {
  id: string;
  text: string;
  cluster_id: number | null;
  created_at: string;
}

export default function QuestionsPanel({
  questions,
  clustering,
  onCluster,
}: {
  questions: Question[];
  clustering: boolean;
  onCluster: () => void;
}) {
  const unclustered = questions.filter((q) => q.cluster_id === null);
  const clustered = questions.filter((q) => q.cluster_id !== null);

  const groups = useMemo(() => {
    const map = new Map<number, Question[]>();
    for (const q of clustered) {
      const arr = map.get(q.cluster_id!) ?? [];
      arr.push(q);
      map.set(q.cluster_id!, arr);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [clustered]);

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
          학생 질문 ({questions.length})
        </h2>
        {unclustered.length >= 2 && (
          <button
            onClick={onCluster}
            disabled={clustering}
            className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            {clustering ? "분석 중..." : "🤖 질문 군집화"}
          </button>
        )}
      </div>

      {questions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          아직 질문이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(([clusterId, qs], gi) => (
            <div key={clusterId} className="rounded-xl bg-background p-4">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${CLUSTER_COLORS[gi % CLUSTER_COLORS.length]}`}
                >
                  그룹 {gi + 1}
                </span>
                <span className="text-xs text-muted">{qs.length}명이 비슷한 질문</span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {qs.map((q) => (
                  <li key={q.id} className="text-sm text-foreground">
                    &ldquo;{q.text}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {unclustered.length > 0 && (
            <div>
              {groups.length > 0 && (
                <p className="mb-2 text-xs text-muted">미분류</p>
              )}
              <ul className="flex flex-col gap-2">
                {unclustered.map((q) => (
                  <li
                    key={q.id}
                    className="rounded-lg bg-background px-4 py-2.5 text-sm text-foreground"
                  >
                    &ldquo;{q.text}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
