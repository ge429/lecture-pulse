"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      setDark(false);
      document.documentElement.classList.remove("dark");
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
      className="fixed top-6 right-6 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-card border border-border hover:border-primary/50 text-muted hover:text-primary transition-all duration-300 shadow-lg"
      aria-label="테마 전환"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
