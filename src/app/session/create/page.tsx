"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function CreateSession() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    setError("");

    const code = generateCode();

    const { error: dbError } = await supabase
      .from("sessions")
      .insert({ code, name: title.trim() });

    if (dbError) {
      setError("수업 생성에 실패했습니다. 다시 시도해주세요.");
      setIsCreating(false);
      return;
    }

    router.push(`/session/${code}/dashboard`);
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

        <h1 className="mb-2 text-2xl font-bold">수업 만들기</h1>
        <p className="mb-8 text-muted">
          수업을 생성하면 학생들이 참여할 수 있는 코드가 발급됩니다.
        </p>

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="title"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              수업 이름
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 데이터구조론 3주차"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={!title.trim() || isCreating}
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "생성 중..." : "수업 시작하기"}
          </button>
        </form>

        <Link
          href="/sessions?role=professor"
          className="mt-6 inline-block text-sm text-muted hover:text-foreground"
        >
          📋 수업 히스토리 보기
        </Link>
      </div>
    </div>
  );
}
