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
      <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-3">Lecture Materials</p>
      <div className="flex flex-col gap-2">
        {materials.map((m) => (
          <div key={m.id}>
            <div className="flex items-center gap-2 rounded-xl bg-surface-dim p-3 border border-border">
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
            {openPdf === m.id && (
              <div className="mt-2 overflow-hidden rounded-xl border border-border">
                <iframe
                  src={m.file_url}
                  className="h-[250px] sm:h-[400px] w-full"
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
