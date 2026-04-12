"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLocale } from "@/components/LocaleProvider";

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
  const { t } = useLocale();
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
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="bg-card max-w-md w-full p-10 rounded-2xl border border-border shadow-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-black font-headline text-foreground mb-2 uppercase tracking-tight">
            {t("create.title")}
          </h2>
          <p className="text-muted text-sm uppercase tracking-widest font-mono">
            {t("create.subtitle")}
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="text-[10px] text-primary uppercase font-bold tracking-widest ml-1"
            >
              Lecture Identity
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("create.placeholder")}
              className="w-full bg-surface-dim border-none rounded-xl focus:ring-1 focus:ring-primary text-foreground p-4 placeholder:text-muted/40 transition-all"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={!title.trim() || isCreating}
            className="w-full bg-gradient-to-r from-primary to-primary-hover text-background py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? t("create.loading") : t("create.submit")}
          </button>

          <Link
            href="/"
            className="w-full text-muted text-xs font-bold hover:text-foreground transition-colors block text-center"
          >
            CANCEL_REQUEST
          </Link>
        </form>

        <Link
          href="/sessions?role=professor"
          className="block text-center text-xs text-muted hover:text-primary transition-colors uppercase tracking-widest"
        >
          📋 Session History
        </Link>
      </div>
    </div>
  );
}
