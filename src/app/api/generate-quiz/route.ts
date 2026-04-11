import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { callClaude } from "@/lib/anthropic";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  // 수업 자료 요약 조회
  const { data: materials } = await supabase
    .from("materials")
    .select("summary")
    .eq("session_id", sessionId)
    .not("summary", "is", null);

  if (!materials || materials.length === 0) {
    return NextResponse.json({ error: "요약된 수업 자료가 없습니다. 먼저 PDF를 업로드하고 AI 요약을 실행해주세요." }, { status: 400 });
  }

  const summaries = materials.map((m) => m.summary).join("\n\n");

  const result = await callClaude([
    {
      role: "user",
      content: `아래는 수업 자료 요약입니다. 이 내용을 바탕으로 학생 이해도를 확인할 수 있는 퀴즈를 만들어주세요.

OX 퀴즈 3개와 객관식 퀴즈 2개를 만들어주세요.

응답 형식 (반드시 JSON만 출력, 다른 텍스트 없이):
{"quizzes": [
  {"question": "질문 내용", "type": "ox", "options": ["O", "X"], "answer": "O"},
  {"question": "질문 내용", "type": "choice", "options": ["보기1", "보기2", "보기3", "보기4"], "answer": "보기1"}
]}

수업 자료:
${summaries.slice(0, 10000)}`,
    },
  ], 1024);

  if (!result.text) {
    return NextResponse.json({ error: result.error || "퀴즈 생성에 실패했습니다." }, { status: 500 });
  }

  // JSON 파싱
  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "퀴즈 형식 파싱 실패" }, { status: 500 });
  }

  let quizzes;
  try {
    quizzes = JSON.parse(jsonMatch[0]).quizzes;
  } catch {
    return NextResponse.json({ error: "퀴즈 JSON 파싱 실패" }, { status: 500 });
  }

  // polls 테이블에 INSERT
  let created = 0;
  for (const quiz of quizzes) {
    const { error } = await supabase.from("polls").insert({
      session_id: sessionId,
      question: quiz.question,
      poll_type: quiz.type,
      options: quiz.options,
      is_open: false,
    });
    if (!error) created++;
  }

  return NextResponse.json({ created, total: quizzes.length });
}
