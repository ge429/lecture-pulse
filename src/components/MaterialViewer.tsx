"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Material {
  id: string;
  file_name: string;
  file_url: string;
  summary: string | null;
}

export default function MaterialViewer({ sessionId }: { sessionId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [openPdf, setOpenPdf] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState<string | null>(null);

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

  const handleSummarize = async (materialId: string) => {
    setSummarizing(materialId);
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialId }),
    });
    if (res.ok) {
      const { summary } = await res.json();
      setMaterials((prev) =>
        prev.map((m) => (m.id === materialId ? { ...m, summary } : m))
      );
    } else {
      const data = await res.json();
      alert(data.error || "요약 생성 실패");
    }
    setSummarizing(null);
  };

  if (materials.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">📄 수업 자료</h2>
      <div className="flex flex-col gap-3">
        {materials.map((m) => (
          <div key={m.id} className="rounded-xl bg-background p-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenPdf(openPdf === m.id ? null : m.id)}
                className="text-sm font-medium text-primary hover:underline"
              >
                📄 {m.file_name}
              </button>
              <a
                href={m.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted hover:text-foreground"
              >
                새 탭
              </a>
              {!m.summary && (
                <button
                  onClick={() => handleSummarize(m.id)}
                  disabled={summarizing === m.id}
                  className="ml-auto rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  {summarizing === m.id ? "요약 중 (최대 30초)..." : "🤖 AI 요약"}
                </button>
              )}
            </div>

            {openPdf === m.id && (
              <div className="mt-3 overflow-hidden rounded-lg border border-border">
                <iframe
                  src={m.file_url}
                  className="h-[400px] w-full"
                  title={m.file_name}
                />
              </div>
            )}

            {m.summary && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold text-primary">🤖 AI 요약</p>
                <div className="whitespace-pre-wrap rounded-lg bg-primary/5 p-3 text-sm leading-relaxed text-foreground">
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
