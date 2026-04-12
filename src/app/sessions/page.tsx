"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getStudentId } from "@/lib/student";
import { formatDate } from "@/lib/format";
import { useLocale } from "@/components/LocaleProvider";

interface Session {
  id: string;
  code: string;
  name: string;
  created_at: string;
  is_active: boolean;
}

export default function SessionsPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center"><p className="text-muted">불러오는 중...</p></div>}>
      <SessionsContent />
    </Suspense>
  );
}

function SessionsContent() {
  const searchParams = useSearchParams();
  const isProfessor = searchParams.get("role") === "professor";
  const { t } = useLocale();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const storageKey = isProfessor ? "lp-hidden-professor" : "lp-hidden-student";

  useEffect(() => {
    // localStorage에서 숨긴 세션 목록 로드
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setHiddenIds(new Set(JSON.parse(saved))); } catch { /* ignore */ }
    }

    async function load() {
      if (isProfessor) {
        const { data } = await supabase
          .from("sessions")
          .select("id, code, name, created_at, is_active")
          .order("created_at", { ascending: false })
          .limit(50);
        if (data) setSessions(data);
      } else {
        const studentId = getStudentId();
        const [{ data: r }, { data: q }] = await Promise.all([
          supabase.from("responses").select("session_id").eq("student_id", studentId),
          supabase.from("questions").select("session_id").eq("student_id", studentId),
        ]);

        const sessionIds = [
          ...new Set([
            ...(r ?? []).map((row) => row.session_id),
            ...(q ?? []).map((row) => row.session_id),
          ]),
        ];

        if (sessionIds.length > 0) {
          const { data } = await supabase
            .from("sessions")
            .select("id, code, name, created_at, is_active")
            .in("id", sessionIds)
            .order("created_at", { ascending: false });
          if (data) setSessions(data);
        }
      }
      setLoading(false);
    }
    load();
  }, [isProfessor, storageKey]);

  function handleHide(id: string) {
    const next = new Set(hiddenIds);
    next.add(id);
    setHiddenIds(next);
    localStorage.setItem(storageKey, JSON.stringify([...next]));
  }

  const visibleSessions = sessions.filter((s) => !hiddenIds.has(s.id));

  return (
    <div className="flex flex-1 flex-col px-6 py-8 md:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 md:mb-12">
          <Link href="/" className="text-xs text-muted hover:text-foreground font-bold uppercase tracking-widest">
            ← Back
          </Link>
          <h1 className="mt-4 text-3xl md:text-4xl font-black font-headline text-foreground uppercase tracking-tighter">
            {t("history.title")}
          </h1>
          <p className="mt-1 text-[10px] text-muted uppercase tracking-widest font-mono">
            {isProfessor ? t("history.professor") : t("history.student")}
          </p>
        </div>

        {loading ? (
          <p className="py-12 text-center text-muted font-mono text-xs uppercase tracking-widest">Loading Data...</p>
        ) : visibleSessions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-4 text-muted">
              {isProfessor ? t("history.empty.professor") : t("history.empty.student")}
            </p>
            <Link
              href={isProfessor ? "/session/create" : "/session/join"}
              className="text-primary hover:brightness-110 font-bold uppercase tracking-wider text-sm"
            >
              {isProfessor ? t("history.create") : t("history.join")}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 md:gap-4">
            {visibleSessions.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-border bg-card p-5 md:p-6 transition-all hover:border-primary/30"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-bold font-headline text-foreground uppercase tracking-tight">{s.name}</h2>
                  {s.is_active ? (
                    <span className="flex items-center gap-1 text-[10px] bg-success/10 text-success px-2 py-0.5 rounded font-bold uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
                    </span>
                  ) : (
                    <span className="text-[10px] bg-muted/10 text-muted px-2 py-0.5 rounded font-bold uppercase">Ended</span>
                  )}
                </div>
                <div className="mb-3 flex items-center gap-3 text-[10px] text-muted font-mono uppercase tracking-widest">
                  <span>{s.code}</span>
                  <span>{formatDate(s.created_at)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isProfessor && s.is_active && (
                    <Link href={`/session/${s.code}/dashboard`} className="rounded-full bg-primary text-background px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all">
                      {t("history.dashboard")}
                    </Link>
                  )}
                  {!isProfessor && s.is_active && (
                    <Link href={`/session/${s.code}/student`} className="rounded-full bg-success text-background px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all">
                      {t("history.rejoin")}
                    </Link>
                  )}
                  <Link href={`/session/${s.code}/report`} className="rounded-full border border-border text-foreground px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:border-primary/50 transition-all">
                    {t("history.report")}
                  </Link>
                  <button
                    onClick={() => handleHide(s.id)}
                    className="ml-auto text-[10px] font-bold text-muted hover:text-danger uppercase tracking-widest transition-colors"
                  >
                    {t("history.hide")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
