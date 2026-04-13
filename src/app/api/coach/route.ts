import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { callClaude } from "@/lib/anthropic";
import { computeLatestStats } from "@/lib/stats";

const FALLBACK = {
  suggestion: "학생들의 혼란도가 높습니다. 현재 내용을 다시 설명해보세요.",
  severity: "warning" as const,
  suggestQuiz: false,
  quizTopic: null as string | null,
};

export async function POST(req: NextRequest) {
  const { sessionId, currentSlide } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  // 1. 이해도 통계 (학생별 최신 응답만)
  const { data: responses } = await supabase
    .from("responses")
    .select("student_id, type, slide_number")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  const allResponses = responses ?? [];
  const stats = computeLatestStats(allResponses);
  const total = stats.understood + stats.confused + stats.lost;

  // 학생별 최신 응답에서 슬라이드별 혼란 집계
  const latestByStudent = new Map<string, { type: string; slide_number: number | null }>();
  for (const r of allResponses) {
    if (!latestByStudent.has(r.student_id)) {
      latestByStudent.set(r.student_id, { type: r.type, slide_number: r.slide_number });
    }
  }

  const slideConfusion = new Map<number, { confused: number; lost: number; understood: number }>();
  for (const { type, slide_number } of latestByStudent.values()) {
    if (slide_number !== null && slide_number !== undefined) {
      const s = slideConfusion.get(slide_number) ?? { confused: 0, lost: 0, understood: 0 };
      if (type === "confused") s.confused++;
      else if (type === "lost") s.lost++;
      else s.understood++;
      slideConfusion.set(slide_number, s);
    }
  }
  const confusedSlides = [...slideConfusion.entries()]
    .map(([slide, v]) => {
      const st = v.confused + v.lost + v.understood;
      return { slide, pct: st > 0 ? Math.round(((v.confused + v.lost) / st) * 100) : 0, st };
    })
    .filter((s) => s.pct >= 30)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)
    .map((s) => `${s.slide + 1}페이지(혼란도 ${s.pct}%)`);

  // 2. 최근 10분 질문
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: questions } = await supabase
    .from("questions")
    .select("text")
    .eq("session_id", sessionId)
    .gte("created_at", tenMinAgo)
    .order("created_at", { ascending: false })
    .limit(20);

  // 3. 강의자료
  const { data: materials } = await supabase
    .from("materials")
    .select("file_name")
    .eq("session_id", sessionId);

  const questionList = (questions ?? []).map((q) => q.text).join("\n- ");
  const materialNames = (materials ?? []).map((m) => m.file_name).join(", ");

  const slideInfo = currentSlide !== undefined && currentSlide !== null
    ? `\n현재 교수 슬라이드: ${currentSlide + 1}페이지`
    : "";
  const confusedSlidesInfo = confusedSlides.length > 0
    ? `\n혼란이 높은 슬라이드: ${confusedSlides.join(", ")}`
    : "";

  const prompt = `현재 수업 실시간 데이터:

참여 학생: ${total}명${slideInfo}${confusedSlidesInfo}
이해됨: ${stats.understood}명 / 헷갈림: ${stats.confused}명 / 모르겠음: ${stats.lost}명
혼란도: ${total > 0 ? Math.round(((stats.confused + stats.lost) / total) * 100) : 0}%

최근 10분 학생 질문:
${questionList || "(질문 없음)"}

강의자료: ${materialNames || "(없음)"}

중요: 위 데이터에 적힌 페이지 번호만 사용하세요. 데이터에 없는 페이지 번호를 만들어내지 마세요.
교수에게 지금 즉시 취할 수 있는 구체적 행동을 제안하세요.
혼란이 높은 슬라이드가 있으면 해당 페이지를 명시하세요.
어떤 개념이 문제인지, 교수가 지금 뭘 하면 되는지, 퀴즈가 필요한지 분석하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{"suggestion": "구체적 제안 내용", "severity": "warning 또는 critical", "suggestQuiz": true/false, "quizTopic": "퀴즈 주제 또는 null"}

severity 기준: 혼란도 60% 이상이면 critical, 그 외 warning`;

  const result = await callClaude([
    {
      role: "user",
      content: prompt,
    },
  ], 512);

  if (!result.text) {
    return NextResponse.json(FALLBACK);
  }

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json(FALLBACK);
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      suggestion: parsed.suggestion || FALLBACK.suggestion,
      severity: parsed.severity === "critical" ? "critical" : "warning",
      suggestQuiz: !!parsed.suggestQuiz,
      quizTopic: parsed.quizTopic || null,
    });
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
