"use client";

import { useState, useRef, useEffect } from "react";
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
  isController: boolean;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const page = currentPage + 1;
  const total = totalPages ?? 0;

  // 컨테이너 크기에 맞춰 PDF 너비 조절
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 16);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

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

      <div ref={containerRef} className="flex justify-center bg-surface-dim rounded-xl overflow-hidden">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => {
            setLoading(false);
            onTotalPages?.(numPages);
          }}
          loading={
            <div className="flex items-center justify-center h-[200px] md:h-[350px] w-full">
              <span className="text-xs text-muted font-mono uppercase tracking-widest">Loading PDF...</span>
            </div>
          }
          error={
            <div className="flex items-center justify-center h-[200px] md:h-[350px] w-full">
              <span className="text-xs text-danger font-mono">PDF를 불러올 수 없습니다</span>
            </div>
          }
        >
          <Page
            pageNumber={page}
            width={containerWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

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
