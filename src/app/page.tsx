import Link from "next/link";
import PulseWave from "@/components/PulseWave";

export default function Home() {
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
            실시간 수업 이해도 피드백 서비스
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
          <Link
            href="/session/create"
            className="w-full sm:w-auto px-8 py-4 bg-primary text-background font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            🎓 교수로 시작하기
          </Link>
          <Link
            href="/session/join"
            className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-success text-success font-bold rounded-xl hover:bg-success/10 transition-all flex items-center justify-center gap-2"
          >
            🙋 학생으로 참여하기
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto pt-8">
          <div className="p-8 bg-card rounded-2xl border border-border group hover:border-primary/30 transition-all duration-300">
            <div className="text-primary mb-4 text-3xl">📊</div>
            <h3 className="font-headline font-bold text-xl mb-3 text-foreground">실시간 분석</h3>
            <p className="text-muted text-sm leading-relaxed">
              수업 중 학생들의 실시간 반응과 이해도를 즉각적인 데이터로 확인하세요.
            </p>
          </div>
          <div className="p-8 bg-card rounded-2xl border border-border group hover:border-success/30 transition-all duration-300">
            <div className="text-success mb-4 text-3xl">🤖</div>
            <h3 className="font-headline font-bold text-xl mb-3 text-foreground">AI 인사이트</h3>
            <p className="text-muted text-sm leading-relaxed">
              수업 종료 후 AI 코치가 제공하는 강의 개선 제안과 핵심 요약 리포트.
            </p>
          </div>
          <div className="p-8 bg-card rounded-2xl border border-border group hover:border-danger/30 transition-all duration-300">
            <div className="text-danger mb-4 text-3xl">💬</div>
            <h3 className="font-headline font-bold text-xl mb-3 text-foreground">양방향 소통</h3>
            <p className="text-muted text-sm leading-relaxed">
              익명 피드백과 실시간 Q&A를 통해 더 깊이 있는 수업 참여를 유도합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
