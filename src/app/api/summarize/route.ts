import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60;

// ── Vision API로 요약 ─────────────────────────────────────────────────────────

async function summarizeImages(images: string[]): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const selected = images.slice(0, 5);

  const content: Record<string, unknown>[] = [];

  for (const img of selected) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: img,
      },
    });
  }

  content.push({
    type: "text",
    text: `위 이미지들은 대학 수업 자료(슬라이드/문서)입니다. 학생이 이해하기 쉽도록 한국어로 요약해주세요.

포함할 내용:
1. 핵심 주제 (한 줄)
2. 주요 개념 정리 (3~5개 bullet point)
3. 꼭 기억해야 할 포인트
4. 수식이나 다이어그램이 있다면 핵심 설명`,
  });

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
        messages: [{ role: "user", content }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Vision API failed:", res.status, errText);
      return null;
    }

    const data = await res.json();
    return data.content?.[0]?.text ?? null;
  } catch (err) {
    console.error("Vision API error:", err);
    return null;
  }
}

// ── PDF → 이미지 변환 ─────────────────────────────────────────────────────────

async function pdfToImages(buffer: Buffer): Promise<string[]> {
  try {
    const { pdf } = await import("pdf-to-img");
    const images: string[] = [];
    const doc = await pdf(buffer, { scale: 1.0 });
    for await (const page of doc) {
      images.push(Buffer.from(page).toString("base64"));
      if (images.length >= 5) break;
    }
    return images;
  } catch (err) {
    console.error("PDF to image error:", err);
    return [];
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

  // PDF → 이미지 → Vision API
  const images = await pdfToImages(buffer);
  if (images.length === 0) {
    return NextResponse.json({ error: "PDF를 처리할 수 없습니다." }, { status: 500 });
  }

  const summary = await summarizeImages(images);
  if (!summary) {
    return NextResponse.json({ error: "요약 생성에 실패했습니다. ANTHROPIC_API_KEY를 확인해주세요." }, { status: 500 });
  }

  await supabase
    .from("materials")
    .update({ summary })
    .eq("id", materialId);

  return NextResponse.json({ summary });
}
