"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLocale } from "@/components/LocaleProvider";

export default function JoinSession() {
  const router = useRouter();
  const { t } = useLocale();
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
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="bg-card max-w-md w-full p-10 rounded-2xl border border-border shadow-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-black font-headline text-foreground mb-2 uppercase tracking-tight">
            {t("join.title")}
          </h2>
          <p className="text-muted text-sm uppercase tracking-widest font-mono">
            {t("join.subtitle")}
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="code"
              className="text-[10px] text-success uppercase font-bold tracking-widest ml-1"
            >
              {t("join.label")}
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("join.placeholder")}
              maxLength={6}
              className="w-full bg-surface-dim border-none rounded-xl focus:ring-1 focus:ring-success text-foreground p-4 placeholder:text-muted/40 transition-all text-center text-2xl tracking-[0.5em] font-black uppercase"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={code.length < 6 || isJoining}
            className="w-full bg-gradient-to-r from-success to-success/80 text-background py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-success/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? t("join.loading") : t("join.submit")}
          </button>

          <Link
            href="/"
            className="w-full text-muted text-xs font-bold hover:text-foreground transition-colors block text-center"
          >
            {t("join.cancel")}
          </Link>
        </form>

        <Link
          href="/sessions"
          className="block text-center text-xs text-muted hover:text-success transition-colors uppercase tracking-widest"
        >
          {t("join.history")}
        </Link>
      </div>
    </div>
  );
}
