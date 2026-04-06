import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── 키워드 기반 간이 군집화 (AI API 키 없을 때 폴백) ──────────────────────────

function clusterByKeywords(
  questions: { id: string; text: string }[]
): Map<number, string[]> {
  const clusters = new Map<number, string[]>(); // clusterId → questionIds
  const clusterLabels: string[][] = []; // 각 클러스터의 키워드 토큰들

  for (const q of questions) {
    const tokens = q.text
      .toLowerCase()
      .replace(/[?？!！.,。]/g, "")
      .split(/\s+/)
      .filter((t) => t.length > 1);

    let bestCluster = -1;
    let bestScore = 0;

    for (let ci = 0; ci < clusterLabels.length; ci++) {
      const overlap = tokens.filter((t) => clusterLabels[ci].includes(t)).length;
      const score = overlap / Math.max(tokens.length, 1);
      if (score > bestScore && score >= 0.3) {
        bestScore = score;
        bestCluster = ci;
      }
    }

    if (bestCluster === -1) {
      bestCluster = clusterLabels.length;
      clusterLabels.push([...tokens]);
      clusters.set(bestCluster, []);
    } else {
      // 새 토큰 추가
      for (const t of tokens) {
        if (!clusterLabels[bestCluster].includes(t)) {
          clusterLabels[bestCluster].push(t);
        }
      }
    }

    clusters.get(bestCluster)!.push(q.id);
  }

  return clusters;
}

// ── AI 군집화 (ANTHROPIC_API_KEY가 있을 때) ────────────────────────────────────

async function clusterByAI(
  questions: { id: string; text: string }[]
): Promise<Map<number, string[]> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `아래는 수업 중 학생들이 보낸 질문 목록입니다. 비슷한 질문끼리 군집으로 묶어주세요.

질문 목록:
${questions.map((q, i) => `${i + 1}. [${q.id}] ${q.text}`).join("\n")}

응답 형식 (JSON만, 다른 텍스트 없이):
{"clusters": [{"ids": ["uuid1", "uuid2"], "label": "군집 요약"}, ...]}`;

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
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const json = JSON.parse(text);

    const result = new Map<number, string[]>();
    for (let i = 0; i < json.clusters.length; i++) {
      result.set(i, json.clusters[i].ids);
    }
    return result;
  } catch {
    return null;
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  // 미군집 질문 조회
  const { data: questions } = await supabase
    .from("questions")
    .select("id, text")
    .eq("session_id", sessionId)
    .is("cluster_id", null)
    .order("created_at", { ascending: true });

  if (!questions || questions.length === 0) {
    return NextResponse.json({ clustered: 0 });
  }

  // AI 군집화 시도 → 실패 시 키워드 폴백
  const clusters = (await clusterByAI(questions)) ?? clusterByKeywords(questions);

  // 기존 최대 cluster_id 조회
  const { data: maxRow } = await supabase
    .from("questions")
    .select("cluster_id")
    .eq("session_id", sessionId)
    .not("cluster_id", "is", null)
    .order("cluster_id", { ascending: false })
    .limit(1)
    .single();

  let nextClusterId = (maxRow?.cluster_id ?? -1) + 1;

  // DB 업데이트
  let clustered = 0;
  for (const [, ids] of clusters) {
    if (ids.length === 0) continue;
    const cid = nextClusterId++;
    await supabase
      .from("questions")
      .update({ cluster_id: cid })
      .in("id", ids);
    clustered += ids.length;
  }

  return NextResponse.json({ clustered });
}
