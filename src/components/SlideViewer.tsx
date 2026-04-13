"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useLocale } from "./LocaleProvider";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SlideViewerProps {
  fileUrl: string;
  currentPage: number;
  totalPages: number | null;
  onPageChange?: (page: number) => void;
  onTotalPages?: (total: number) => void;
  isController: boolean; // true=교수(넘기기 가능), false=학생(읽기 전용)
}

export default function SlideViewer({
  fileUrl,
  currentPage,
  totalPages,
  onPageChange,
  onTotalPages,
  isController,
}: SlideViewerProps) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const page = currentPage + 1; // 0-based → 1-based
  const total = totalPages ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-foreground text-sm uppercase tracking-tight">
          {isController ? "Slide Control" : t("comp.materials")}
        </h4>
        {total > 0 && (
          <span className="text-[10px] text-muted font-mono">
            {page} / {total}
          </span>
        )}
      </div>

      {/* PDF Render */}
      <div className="flex justify-center bg-surface-dim rounded-xl overflow-hidden min-h-[200px] md:min-h-[350px]">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => {
            setLoading(false);
            onTotalPages?.(numPages);
          }}
          loading={
            <div className="flex items-center justify-center h-[200px] md:h-[350px]">
              <span className="text-xs text-muted font-mono uppercase tracking-widest">Loading PDF...</span>
            </div>
          }
          error={
            <div className="flex items-center justify-center h-[200px] md:h-[350px]">
              <span className="text-xs text-danger font-mono">PDF를 불러올 수 없습니다</span>
            </div>
          }
        >
          <Page
            pageNumber={page}
            width={typeof window !== "undefined" ? Math.min(window.innerWidth - 80, 700) : 600}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      {/* Controls (교수만) */}
      {isController && !loading && total > 0 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => onPageChange?.(Math.max(0, currentPage - 1))}
            disabled={currentPage <= 0}
            className="rounded-full bg-surface-container px-4 py-2 text-sm font-bold text-foreground hover:bg-card-hover disabled:opacity-30 transition-all"
          >
            ◀ 이전
          </button>
          <span className="text-foreground font-mono font-bold text-lg">
            {page} / {total}
          </span>
          <button
            onClick={() => onPageChange?.(Math.min(total - 1, currentPage + 1))}
            disabled={currentPage >= total - 1}
            className="rounded-full bg-surface-container px-4 py-2 text-sm font-bold text-foreground hover:bg-card-hover disabled:opacity-30 transition-all"
          >
            다음 ▶
          </button>
        </div>
      )}
    </div>
  );
}
