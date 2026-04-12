"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useLocale } from "./LocaleProvider";

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
  const { t } = useLocale();
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadToStorage = async (file: File) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filePath = `${sessionId}/${Date.now()}_${safeName}`;

    const { error } = await supabase.storage
      .from("materials")
      .upload(filePath, file, { contentType: "application/pdf" });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from("materials").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const saveToDb = async (fileName: string, fileUrl: string) => {
    const { data } = await supabase.from("materials")
      .insert({ session_id: sessionId, file_name: fileName, file_url: fileUrl })
      .select("id").single();
    return data?.id ?? null;
  };

  const generateSummary = async (materialId: string, fileUrl: string, fileName: string) => {
    setSummarizing(true);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl, fileName }),
      });
      if (res.ok) {
        const { summary } = await res.json();
        await supabase.from("materials").update({ summary }).eq("id", materialId);
        onUploaded();
      }
    } catch { /* 요약 실패해도 업로드는 성공 */ }
    setSummarizing(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".pdf")) return;

    setUploading(true);
    try {
      const fileUrl = await uploadToStorage(file);
      const materialId = await saveToDb(file.name, fileUrl);
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();

      if (materialId) generateSummary(materialId, fileUrl, file.name);
    } catch (err) {
      alert(`파일 업로드 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (deleting) return;
    setDeleting(id);
    const path = fileUrl.split("/materials/")[1];
    if (path) {
      await supabase.storage.from("materials").remove([decodeURIComponent(path)]);
    }
    await supabase.from("materials").delete().eq("id", id);
    setDeleting(null);
    onUploaded();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="font-black text-foreground uppercase tracking-tight text-sm">{t("comp.materials")}</h4>
          <span className="text-[10px] text-muted">{materials.length} files</span>
        </div>
        <label className="cursor-pointer rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 uppercase tracking-widest transition-all">
          {uploading ? t("comp.uploading") : t("comp.upload")}
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

      {summarizing && (
        <div className="mb-3 rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{t("comp.analyzing")}</span>
        </div>
      )}

      {materials.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted font-mono uppercase tracking-widest">
          {t("comp.noFiles")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {materials.map((m) => (
            <div key={m.id} className="rounded-xl bg-surface-dim p-3 border border-border">
              <div className="flex items-center justify-between">
                <a
                  href={m.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary hover:brightness-110 truncate max-w-[200px] sm:max-w-none"
                >
                  📄 {m.file_name}
                </a>
                <div className="flex items-center gap-2">
                  {m.summary && <span className="text-[10px] text-success font-bold">{t("comp.summarized")}</span>}
                  <button
                    onClick={() => handleDelete(m.id, m.file_url)}
                    disabled={deleting === m.id}
                    className="text-[10px] font-bold text-muted hover:text-danger uppercase tracking-widest transition-colors disabled:opacity-50"
                  >
                    {deleting === m.id ? "..." : t("comp.delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
