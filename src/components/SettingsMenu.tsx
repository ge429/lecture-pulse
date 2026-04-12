"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "./LocaleProvider";
import { LOCALE_LABELS } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const { locale, setLocale, t } = useLocale();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      setDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div ref={menuRef} className="fixed top-6 right-6 z-50">
      {/* 더보기 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-card border border-border hover:border-primary/50 text-muted hover:text-primary transition-all duration-300 shadow-lg"
        aria-label="설정"
      >
        {open ? "✕" : "⚙️"}
      </button>

      {/* 드롭다운 메뉴 */}
      {open && (
        <div className="absolute top-14 right-0 w-56 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
          {/* 다크모드 */}
          <button
            onClick={toggleDark}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-foreground hover:bg-surface-dim transition-colors"
          >
            <span>{dark ? "☀️" : "🌙"} {t("menu.darkMode")}</span>
            <span className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${dark ? "bg-primary justify-end" : "bg-border justify-start"}`}>
              <span className="w-4 h-4 rounded-full bg-white shadow" />
            </span>
          </button>

          <div className="h-px bg-border" />

          {/* 언어 선택 */}
          <div className="px-4 py-2">
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest">
              🌐 {t("menu.language")}
            </span>
          </div>
          {(["ko", "en", "zh"] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => { setLocale(l); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                locale === l
                  ? "text-primary bg-primary/5"
                  : "text-foreground hover:bg-surface-dim"
              }`}
            >
              <span>{LOCALE_LABELS[l]}</span>
              {locale === l && <span className="text-primary text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
