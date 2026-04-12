"use client";

import Link from "next/link";
import PulseWave from "@/components/PulseWave";
import { useLocale } from "@/components/LocaleProvider";

export default function Home() {
  const { t } = useLocale();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-6xl text-center space-y-16">
        {/* Hero */}
        <div className="space-y-4 py-12 relative">
          <PulseWave />
          <h1 className="text-5xl md:text-8xl font-black font-headline tracking-tighter leading-none text-foreground">
            Lecture{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-success">
              Pulse
            </span>
            .
          </h1>
          <p className="text-muted max-w-xl mx-auto text-lg leading-relaxed font-headline">
            {t("landing.subtitle")}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
          <Link
            href="/session/create"
            className="w-full sm:w-auto px-8 py-4 bg-primary text-background font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            {t("landing.professor")}
          </Link>
          <Link
            href="/session/join"
            className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-success text-success font-bold rounded-xl hover:bg-success/10 transition-all flex items-center justify-center gap-2"
          >
            {t("landing.student")}
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto pt-8">
          <div className="p-8 bg-card rounded-2xl border border-border group hover:border-primary/30 transition-all duration-300">
            <div className="text-primary mb-4 text-3xl">📊</div>
            <h3 className="font-headline font-bold text-xl mb-3 text-foreground">{t("landing.analysis")}</h3>
            <p className="text-muted text-sm leading-relaxed">{t("landing.analysisDesc")}</p>
          </div>
          <div className="p-8 bg-card rounded-2xl border border-border group hover:border-success/30 transition-all duration-300">
            <div className="text-success mb-4 text-3xl">🤖</div>
            <h3 className="font-headline font-bold text-xl mb-3 text-foreground">{t("landing.ai")}</h3>
            <p className="text-muted text-sm leading-relaxed">{t("landing.aiDesc")}</p>
          </div>
          <div className="p-8 bg-card rounded-2xl border border-border group hover:border-danger/30 transition-all duration-300">
            <div className="text-danger mb-4 text-3xl">💬</div>
            <h3 className="font-headline font-bold text-xl mb-3 text-foreground">{t("landing.interactive")}</h3>
            <p className="text-muted text-sm leading-relaxed">{t("landing.interactiveDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
