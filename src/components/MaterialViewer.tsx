"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLocale } from "./LocaleProvider";

interface Material {
  id: string;
  file_name: string;
  file_url: string;
  summary: string | null;
}

export default function MaterialViewer({ sessionId }: { sessionId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [openPdf, setOpenPdf] = useState<string | null>(null);
  const [openSummary, setOpenSummary] = useState<string | null>(null);
  const { t } = useLocale();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("materials")
        .select("id, file_name, file_url, summary")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });
      if (data) setMaterials(data);
    }
    load();
  }, [sessionId]);

  if (materials.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-3">{t("comp.materials")}</p>
      <div className="flex flex-col gap-3">
        {materials.map((m) => (
          <div key={m.id} className="rounded-xl bg-surface-dim p-3 md:p-4 border border-border">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenPdf(openPdf === m.id ? null : m.id)}
                className="text-xs font-medium text-primary hover:brightness-110 truncate max-w-[200px] sm:max-w-none"
              >
                📄 {m.file_name}
              </button>
              <a
                href={m.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-[10px] text-muted hover:text-foreground font-bold uppercase tracking-widest"
              >
                Open
              </a>
            </div>

            {/* 버튼 영역 */}
            {m.summary && (
              <div className="mt-2">
                <button
                  onClick={() => setOpenSummary(openSummary === m.id ? null : m.id)}
                  className="rounded-full bg-success/10 px-3 py-1 text-[10px] font-bold text-success hover:bg-success/20 uppercase tracking-widest transition-all"
                >
                  {openSummary === m.id ? t("comp.closeSummary") : t("comp.viewSummary")}
                </button>
              </div>
            )}
            {!m.summary && (
              <div className="mt-2">
                <span className="text-[10px] text-muted font-mono">{t("comp.summaryWaiting")}</span>
              </div>
            )}

            {/* PDF 뷰어 */}
            {openPdf === m.id && (
              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                <iframe
                  src={m.file_url}
                  className="h-[250px] sm:h-[400px] w-full"
                  title={m.file_name}
                />
              </div>
            )}

            {/* 요약 표시 */}
            {openSummary === m.id && m.summary && (
              <div className="mt-3 rounded-xl bg-card border border-primary/20 p-4">
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-2">📌 AI 핵심 요약</p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {m.summary}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
