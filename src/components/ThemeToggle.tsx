"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggle = () => {
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
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-lg transition-colors hover:bg-border/50"
      aria-label="테마 전환"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
