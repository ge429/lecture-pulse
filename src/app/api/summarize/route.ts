import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60;

// ── PDF를 직접 Claude에 전송하여 요약 ──────────────────────────────────────────

async function summarizePdf(pdfBase64: string): Promise<{ summary: string | null; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { summary: null, error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2025-04-01",
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
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: `이 PDF는 대학 수업 자료입니다. 학생이 이해하기 쉽도록 한국어로 요약해주세요.

포함할 내용:
1. 핵심 주제 (한 줄)
2. 주요 개념 정리 (3~5개 bullet point)
3. 꼭 기억해야 할 포인트
4. 수식이나 다이어그램이 있다면 핵심 설명`,
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

// ── POST handler ──────────────────────────────────────────────────────────────

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

  // PDF 다운로드
  const pdfRes = await fetch(material.file_url);
  if (!pdfRes.ok) {
    return NextResponse.json({ error: "PDF download failed" }, { status: 500 });
  }

  const buffer = Buffer.from(await pdfRes.arrayBuffer());
  const pdfBase64 = buffer.toString("base64");

  // Claude에 PDF 직접 전송
  const result = await summarizePdf(pdfBase64);
  if (!result.summary) {
    return NextResponse.json({ error: result.error || "요약 생성에 실패했습니다." }, { status: 500 });
  }
  const summary = result.summary;

  await supabase
    .from("materials")
    .update({ summary })
    .eq("id", materialId);

  return NextResponse.json({ summary });
}
