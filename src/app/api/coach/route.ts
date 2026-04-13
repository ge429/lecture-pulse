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

  // 1. 이해도 통계
  const { data: responses } = await supabase
    .from("responses")
    .select("student_id, type")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  const stats = computeLatestStats(responses ?? []);
  const total = stats.understood + stats.confused + stats.lost;

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

  const slideInfo = currentSlide !== undefined ? `\n현재 슬라이드: ${currentSlide + 1}페이지` : "";

  const prompt = `현재 수업 실시간 데이터:

참여 학생: ${total}명${slideInfo}
이해됨: ${stats.understood}명 / 헷갈림: ${stats.confused}명 / 모르겠음: ${stats.lost}명
혼란도: ${total > 0 ? Math.round(((stats.confused + stats.lost) / total) * 100) : 0}%

최근 10분 학생 질문:
${questionList || "(질문 없음)"}

강의자료: ${materialNames || "(없음)"}

위 데이터를 분석해서 교수에게 지금 즉시 취할 수 있는 구체적 행동을 제안하세요.
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
