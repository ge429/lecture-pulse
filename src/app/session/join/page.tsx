"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function JoinSession() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsJoining(true);
    setError("");

    const { data } = await supabase
      .from("sessions")
      .select("id")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (!data) {
      setError("존재하지 않거나 종료된 수업입니다.");
      setIsJoining(false);
      return;
    }

    router.push(`/session/${code.toUpperCase()}/student`);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          ← 홈으로
        </Link>

        <h1 className="mb-2 text-2xl font-bold">수업 참여하기</h1>
        <p className="mb-8 text-muted">
          교수님이 알려준 수업 코드를 입력하세요.
        </p>

        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="code"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              수업 코드
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="예: ABC123"
              maxLength={6}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest text-foreground placeholder:text-muted/60 placeholder:text-lg placeholder:tracking-normal placeholder:font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={code.length < 4 || isJoining}
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? "참여 중..." : "수업 참여하기"}
          </button>
        </form>

        <Link
          href="/sessions"
          className="mt-6 inline-block text-sm text-muted hover:text-foreground"
        >
          📋 수업 히스토리 보기
        </Link>
      </div>
    </div>
  );
}
