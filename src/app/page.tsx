import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-2 text-5xl">📡</div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
          Lecture Pulse
        </h1>
        <p className="mb-10 text-muted">
          실시간 수업 이해도 피드백 서비스
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/session/create"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            🎓 교수로 시작하기
          </Link>
          <Link
            href="/session/join"
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary px-6 py-4 text-lg font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            🙋 학생으로 참여하기
          </Link>
        </div>
      </div>
    </div>
  );
}
