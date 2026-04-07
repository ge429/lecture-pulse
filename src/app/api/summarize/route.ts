import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

async function summarizeWithAI(text: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // 텍스트가 너무 길면 앞부분만 사용 (토큰 제한)
  const truncated = text.slice(0, 15000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `아래는 대학 수업 자료(PDF)의 텍스트입니다. 학생이 이해하기 쉽도록 한국어로 요약해주세요.

포함할 내용:
1. 핵심 주제 (한 줄)
2. 주요 개념 정리 (3~5개 bullet point)
3. 꼭 기억해야 할 포인트

텍스트:
${truncated}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("Summarize API failed:", res.status);
      return null;
    }

    const data = await res.json();
    return data.content?.[0]?.text ?? null;
  } catch (err) {
    console.error("Summarize error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { materialId } = await req.json();
  if (!materialId) {
    return NextResponse.json({ error: "materialId required" }, { status: 400 });
  }

  // 파일 URL 조회
  const { data: material } = await supabase
    .from("materials")
    .select("file_url, summary")
    .eq("id", materialId)
    .single();

  if (!material) {
    return NextResponse.json({ error: "material not found" }, { status: 404 });
  }

  // 이미 요약이 있으면 반환
  if (material.summary) {
    return NextResponse.json({ summary: material.summary });
  }

  // PDF 다운로드
  const pdfRes = await fetch(material.file_url);
  if (!pdfRes.ok) {
    return NextResponse.json({ error: "PDF download failed" }, { status: 500 });
  }

  const buffer = Buffer.from(await pdfRes.arrayBuffer());

  // 텍스트 추출
  let text: string;
  try {
    const parsed = await pdfParse(buffer);
    text = parsed.text;
  } catch {
    return NextResponse.json({ error: "PDF parse failed" }, { status: 500 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "PDF에서 텍스트를 추출할 수 없습니다 (이미지 기반 PDF일 수 있음)" }, { status: 400 });
  }

  // AI 요약
  const summary = await summarizeWithAI(text);
  if (!summary) {
    return NextResponse.json({ error: "요약 생성에 실패했습니다. ANTHROPIC_API_KEY를 확인해주세요." }, { status: 500 });
  }

  // DB에 요약 저장
  await supabase
    .from("materials")
    .update({ summary })
    .eq("id", materialId);

  return NextResponse.json({ summary });
}
