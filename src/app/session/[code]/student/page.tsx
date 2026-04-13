"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getStudentId } from "@/lib/student";
import { SIGNALS, SIGNAL_RESET_DELAY } from "@/lib/constants";
import type { ResponseType } from "@/lib/database.types";
import ActivePoll from "@/components/ActivePoll";
import QuestionInput from "@/components/QuestionInput";
import MaterialViewer from "@/components/MaterialViewer";
import { useLocale } from "@/components/LocaleProvider";

const SIGNAL_KEYS: Record<string, string> = {
  understood: "student.understood",
  confused: "student.confused",
  lost: "student.lost",
};

const SIGNAL_STYLES: Record<string, { border: string; hover: string; icon: string }> = {
  understood: { border: "border-success/50", hover: "hover:bg-success/10", icon: "text-success" },
  confused: { border: "border-primary/50", hover: "hover:bg-primary/10", icon: "text-primary" },
  lost: { border: "border-danger/50", hover: "hover:bg-danger/10", icon: "text-danger" },
};

export default function StudentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { t } = useLocale();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase
        .from("sessions")
        .select("id, is_active")
        .eq("code", code)
        .single();

      if (data) {
        setSessionId(data.id);
        if (!data.is_active) setEnded(true);
      } else {
        setError("존재하지 않는 수업입니다.");
      }
    }
    loadSession();
  }, [code]);

  useEffect(() => {
    if (!sessionId || ended) return;

    const channel = supabase
      .channel(`session-status-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.new && payload.new.is_active === false) {
            setEnded(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, ended]);

  const handleSignal = async (signalId: ResponseType) => {
    if (!sessionId) return;
    setSelected(signalId);

    const { error: dbError } = await supabase.from("responses").insert({
      session_id: sessionId,
      student_id: getStudentId(),
      type: signalId,
    });

    if (dbError) {
      setError("전송에 실패했습니다. 다시 시도해주세요.");
      setSelected(null);
      return;
    }

    setLastSent(signalId);
    setTimeout(() => setSelected(null), SIGNAL_RESET_DELAY);
  };

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-lg text-danger">{error}</p>
        <Link href="/session/join" className="text-primary hover:underline">다시 참여하기</Link>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted font-mono text-xs uppercase tracking-widest">Connecting to Neural Network...</p>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10">
          <div className="mb-4 text-4xl">📚</div>
          <h1 className="mb-2 text-xl font-black font-headline text-foreground uppercase">{t("student.ended")}</h1>
          <p className="mb-6 text-sm text-muted">{t("student.endedDesc")}</p>
          <Link
            href="/"
            className="inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-bold text-background transition-all hover:brightness-110"
          >
            {t("student.home")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 md:px-8 py-8">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <Link href="/" className="text-xs text-muted hover:text-foreground font-bold uppercase tracking-widest">
            {t("common.back")}
          </Link>
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-black font-headline text-foreground uppercase">{t("student.active")}</h1>
            <p className="text-muted text-[10px] font-mono tracking-widest uppercase">{t("student.selectLevel")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] text-muted font-mono tracking-widest uppercase">{code}</span>
          </div>
        </div>

        {/* Main Grid: mobile=1col, PC=2col */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Signal Buttons */}
          <div className="lg:col-span-7 space-y-4">
            {/* Mobile: vertical stack, PC: horizontal 3-col */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SIGNALS.map((signal) => {
                const style = SIGNAL_STYLES[signal.id] || SIGNAL_STYLES.understood;
                const isSelected = selected === signal.id;
                const wasLast = lastSent === signal.id && selected === null;

                return (
                  <button
                    key={signal.id}
                    onClick={() => handleSignal(signal.id)}
                    disabled={selected !== null}
                    className={`group w-full h-28 md:h-40 lg:h-48 bg-card ${style.hover} border ${
                      isSelected ? style.border + " scale-[0.97]" : wasLast ? style.border : "border-border"
                    } rounded-3xl transition-all duration-300 flex flex-col items-center justify-center gap-3 disabled:opacity-70`}
                  >
                    <span className={`text-4xl md:text-5xl lg:text-6xl ${style.icon} group-hover:scale-110 transition-transform`}>
                      {signal.emoji}
                    </span>
                    <span className="text-lg md:text-xl font-black text-foreground uppercase tracking-widest">
                      {t(SIGNAL_KEYS[signal.id])}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] text-muted font-mono">SIGNAL_TRANSMITTED</span>
                    )}
                  </button>
                );
              })}
            </div>

            {lastSent && selected === null && (
              <div className="bg-surface-dim p-4 rounded-2xl border border-border">
                <p className="text-[10px] text-muted font-mono uppercase tracking-widest">
                  {t(SIGNAL_KEYS[lastSent!])}
                </p>
              </div>
            )}

            {/* PC: Materials below buttons */}
            <div className="hidden lg:block">
              <MaterialViewer sessionId={sessionId} />
            </div>
          </div>

          {/* Right: Quiz + Question + Materials(mobile) */}
          <div className="lg:col-span-5 space-y-4">
            <ActivePoll sessionId={sessionId} />
            <QuestionInput sessionId={sessionId} />
            {/* Mobile only: Materials */}
            <div className="lg:hidden">
              <MaterialViewer sessionId={sessionId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
