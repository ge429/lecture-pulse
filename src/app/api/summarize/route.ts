import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60;

async function summarizePdf(fileUrl: string): Promise<{ summary: string | null; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { summary: null, error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." };

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
            content: [
              {
                type: "document",
                source: {
                  type: "url",
                  url: fileUrl,
                },
              },
              {
                type: "text",
                text: `이 PDF는 대학 수업 자료입니다. 학생이 시험 전에 빠르게 복습할 수 있도록 한국어로 요약해주세요.

톤:
- 친구에게 설명하듯 자연스럽고 읽기 편하게
- 너무 딱딱하지 않게, 하지만 가볍지도 않게
- 핵심을 빠르게 파악할 수 있도록

규칙:
- 마크다운 문법(샵, 별표, 대시줄, 코드블록 등) 절대 사용하지 마세요. 순수 텍스트만 작성하세요.
- 마크다운 표(table)도 사용하지 마세요
- 특수기호(★, ◆, ■ 등)는 사용하지 마세요
- 이모지는 각 섹션 제목에만 1개씩 사용하세요
- 개념 설명은 1~2문장으로 짧게, 쉬운 말로
- 줄바꿈을 넉넉히 써서 시각적으로 여유있게
- 불릿은 "- " 만 사용하세요

형식:

📌 한 줄 요약
이 자료가 다루는 핵심을 한 문장으로.

📖 주요 개념
각 개념을 짧고 쉽게 설명. 3~5개.

💡 꼭 기억할 것
시험에 나올 만한 핵심 포인트 2~3개. 한 줄씩.

📝 과제/할 일 (있는 경우만)
과제 내용, 마감일, 제출 방법 등을 빠짐없이 정리.

🔧 수식/다이어그램 (있는 경우만)
주요 수식이나 도표가 뜻하는 바를 쉽게 풀어서.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude API failed:", res.status, errText);
      return { summary: null, error: `Claude API 오류 (${res.status}): ${errText.slice(0, 200)}` };
    }

    const data = await res.json();
    return { summary: data.content?.[0]?.text ?? null };
  } catch (err) {
    console.error("Claude API error:", err);
    return { summary: null, error: `API 호출 실패: ${String(err).slice(0, 200)}` };
  }
}

export async function POST(req: NextRequest) {
  const { materialId } = await req.json();
  if (!materialId) {
    return NextResponse.json({ error: "materialId required" }, { status: 400 });
  }

  const { data: material } = await supabase
    .from("materials")
    .select("file_url, summary")
    .eq("id", materialId)
    .single();

  if (!material) {
    return NextResponse.json({ error: "material not found" }, { status: 404 });
  }

  if (material.summary) {
    return NextResponse.json({ summary: material.summary });
  }

  const result = await summarizePdf(material.file_url);
  if (!result.summary) {
    return NextResponse.json({ error: result.error || "요약 생성에 실패했습니다." }, { status: 500 });
  }

  await supabase
    .from("materials")
    .update({ summary: result.summary })
    .eq("id", materialId);

  return NextResponse.json({ summary: result.summary });
}
