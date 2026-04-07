"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Session {
  id: string;
  code: string;
  name: string;
  created_at: string;
  is_active: boolean;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("sessions")
        .select("id, code, name, created_at, is_active")
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) setSessions(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(id: string) {
    if (deleting) return;
    setDeleting(id);
    await supabase.from("sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground"
          >
            ← 홈으로
          </Link>
          <h1 className="text-lg font-bold">수업 히스토리</h1>
          <div className="w-12" />
        </div>

        {loading ? (
          <p className="py-12 text-center text-muted">불러오는 중...</p>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-muted">아직 생성된 수업이 없습니다.</p>
            <Link
              href="/session/create"
              className="text-primary hover:underline"
            >
              수업 만들기
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
                  {s.is_active && (
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
