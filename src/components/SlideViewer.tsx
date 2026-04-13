"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const page = currentPage + 1;
  const total = totalPages ?? 0;

  const updateWidth = useCallback(() => {
    if (fullscreen) {
      setContainerWidth(window.innerWidth - 32);
    } else if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth - 16);
    }
  }, [fullscreen]);

  useEffect(() => {
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [updateWidth]);

  // ESC 키로 전체화면 닫기
  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullscreen]);

  const pdfContent = (
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
  );

  // 전체화면 모달
  if (fullscreen) {
    return (
      <div
        ref={fullscreenRef}
        className="fixed inset-0 z-[100] bg-background flex flex-col"
        onClick={(e) => { if (e.target === fullscreenRef.current) setFullscreen(false); }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-bold text-foreground font-mono">
            {page} / {total}
          </span>
          <button
            onClick={() => setFullscreen(false)}
            className="rounded-full bg-card border border-border px-4 py-1.5 text-xs font-bold text-foreground hover:bg-card-hover transition-all"
          >
            ✕ 닫기
          </button>
        </div>

        {/* PDF */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-4">
          {pdfContent}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-foreground text-sm uppercase tracking-tight">
          {isController ? "Slide Control" : t("comp.materials")}
        </h4>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className="text-[10px] text-muted font-mono">
              {page} / {total}
            </span>
          )}
          {!isController && !loading && total > 0 && (
            <button
              onClick={() => setFullscreen(true)}
              className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold text-foreground hover:bg-card-hover transition-all"
            >
              ⛶ 전체화면
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex justify-center bg-surface-dim rounded-xl overflow-hidden">
        {pdfContent}
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
