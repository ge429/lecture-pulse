"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface Material {
  id: string;
  file_name: string;
  file_url: string;
  summary: string | null;
}

export default function MaterialUpload({
  sessionId,
  materials,
  onUploaded,
}: {
  sessionId: string;
  materials: Material[];
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".pdf")) return;

    setUploading(true);

    const filePath = `${sessionId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("materials")
      .upload(filePath, file, { contentType: "application/pdf" });

    if (uploadError) {
      alert(`파일 업로드 실패: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("materials")
      .getPublicUrl(filePath);

    await supabase.from("materials").insert({
      session_id: sessionId,
      file_name: file.name,
      file_url: urlData.publicUrl,
    });

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    onUploaded();
  };

  const handleSummarize = async (materialId: string) => {
    setSummarizing(materialId);
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialId }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "요약 생성 실패");
    }
    setSummarizing(null);
    onUploaded();
  };

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
          수업 자료
        </h2>
        <label className="cursor-pointer rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
          {uploading ? "업로드 중..." : "+ PDF 업로드"}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {materials.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">
          아직 업로드된 자료가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {materials.map((m) => (
            <div key={m.id} className="rounded-xl bg-background p-4">
              <div className="flex items-center justify-between">
                <a
                  href={m.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  📄 {m.file_name}
                </a>
                {!m.summary && (
                  <button
                    onClick={() => handleSummarize(m.id)}
                    disabled={summarizing === m.id}
                    className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    {summarizing === m.id ? "요약 중..." : "🤖 AI 요약"}
                  </button>
                )}
              </div>
              {m.summary && (
                <div className="mt-3 whitespace-pre-wrap rounded-lg bg-primary/5 p-3 text-sm leading-relaxed text-foreground">
                  {m.summary}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
