"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getStudentId } from "@/lib/student";
import { formatDate } from "@/lib/format";

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

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (isProfessor) {
        // 교수: 전체 세션 조회
        const { data } = await supabase
          .from("sessions")
          .select("id, code, name, created_at, is_active")
          .order("created_at", { ascending: false })
          .limit(50);
        if (data) setSessions(data);
      } else {
        // 학생: 참여한 세션만 (responses 또는 questions에 기록이 있는 세션)
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
  }, [isProfessor]);

  async function handleDelete(id: string) {
    if (deleting) return;
    setDeleting(id);
    await supabase.from("sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← 홈으로
          </Link>
          <h1 className="text-lg font-bold">수업 히스토리</h1>
          <div className="w-12" />
        </div>

        {loading ? (
          <p className="py-12 text-center text-muted">불러오는 중...</p>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-muted">
              {isProfessor ? "아직 생성된 수업이 없습니다." : "참여한 수업이 없습니다."}
            </p>
            <Link
              href={isProfessor ? "/session/create" : "/session/join"}
              className="text-primary hover:underline"
            >
              {isProfessor ? "수업 만들기" : "수업 참여하기"}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold text-foreground">{s.name}</h2>
                  {s.is_active ? (
                    <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
                      진행 중
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted/15 px-2.5 py-0.5 text-xs font-bold text-muted">
                      종료됨
                    </span>
                  )}
                </div>
                <div className="mb-3 flex items-center gap-3 text-sm text-muted">
                  <span className="font-mono">{s.code}</span>
                  <span>{formatDate(s.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isProfessor && s.is_active && (
                    <Link
                      href={`/session/${s.code}/dashboard`}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                    >
                      대시보드
                    </Link>
                  )}
                  <Link
                    href={`/session/${s.code}/report`}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background"
                  >
                    리포트
                  </Link>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                    className="ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
                  >
                    {deleting === s.id ? "삭제 중..." : "삭제"}
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
