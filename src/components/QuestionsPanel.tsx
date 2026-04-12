"use client";

import { useMemo } from "react";
import { CLUSTER_COLORS } from "@/lib/constants";
import { useLocale } from "./LocaleProvider";

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
  const { t } = useLocale();
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
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="font-black text-foreground uppercase tracking-tight text-sm">{t("comp.questions")}</h4>
          <span className="text-[10px] text-muted">{questions.length} active</span>
        </div>
        {unclustered.length >= 2 && (
          <button
            onClick={onCluster}
            disabled={clustering}
            className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 disabled:opacity-50 uppercase tracking-widest"
          >
            {clustering ? t("comp.clustering") : t("comp.cluster")}
          </button>
        )}
      </div>

      {questions.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted font-mono uppercase tracking-widest">
          {t("comp.noQueries")}
        </p>
      ) : (
        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
          {groups.map(([clusterId, qs], gi) => (
            <div key={clusterId} className="rounded-xl bg-surface-dim p-3 md:p-4 border-l-2 border-primary">
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CLUSTER_COLORS[gi % CLUSTER_COLORS.length]}`}>
                  Group {gi + 1}
                </span>
                <span className="text-[10px] text-muted">{qs.length}명</span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {qs.map((q) => (
                  <li key={q.id} className="text-xs text-foreground">&ldquo;{q.text}&rdquo;</li>
                ))}
              </ul>
            </div>
          ))}

          {unclustered.map((q) => (
            <div key={q.id} className="bg-surface-dim p-3 rounded-xl border border-border">
              <p className="text-xs text-foreground">{q.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
