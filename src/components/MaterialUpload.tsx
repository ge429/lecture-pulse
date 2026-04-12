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
    // Storage에서 파일 삭제
    const path = fileUrl.split("/materials/")[1];
    if (path) {
      await supabase.storage.from("materials").remove([decodeURIComponent(path)]);
    }
    // DB에서 삭제
    await supabase.from("materials").delete().eq("id", id);
    setDeleting(null);
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
                  className="text-sm font-medium text-primary hover:underline truncate max-w-[200px] sm:max-w-none"
                >
                  📄 {m.file_name}
                </a>
                <button
                  onClick={() => handleDelete(m.id, m.file_url)}
                  disabled={deleting === m.id}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
                >
                  {deleting === m.id ? "..." : "삭제"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
