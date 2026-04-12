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
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".pdf")) return;

    setUploading(true);

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filePath = `${sessionId}/${Date.now()}_${safeName}`;

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
          <h4 className="font-black text-foreground uppercase tracking-tight text-sm">Lecture Materials</h4>
          <span className="text-[10px] text-muted">{materials.length} files</span>
        </div>
        <label className="cursor-pointer rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 uppercase tracking-widest transition-all">
          {uploading ? "Uploading..." : "+ Upload PDF"}
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
        <p className="py-4 text-center text-xs text-muted font-mono uppercase tracking-widest">
          No files uploaded
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {materials.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-surface-dim p-3 border border-border">
              <a
                href={m.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:brightness-110 truncate max-w-[200px] sm:max-w-none"
              >
                📄 {m.file_name}
              </a>
              <button
                onClick={() => handleDelete(m.id, m.file_url)}
                disabled={deleting === m.id}
                className="text-[10px] font-bold text-muted hover:text-danger uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {deleting === m.id ? "..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
