"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Material {
  id: string;
  file_name: string;
  file_url: string;
}

export default function MaterialViewer({ sessionId }: { sessionId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [openPdf, setOpenPdf] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("materials")
        .select("id, file_name, file_url")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });
      if (data) setMaterials(data);
    }
    load();
  }, [sessionId]);

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
          </div>
        ))}
      </div>
    </div>
  );
}
